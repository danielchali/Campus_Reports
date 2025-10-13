"use client";
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '../../config/constants';
import { getAll, create, remove } from '../../utils/api';
import { useOfflineApi } from '../../hooks/useOfflineSync';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

// Type for a staff member
interface Staff {
  staffId: string;
  fullName: string;
  department: string;
  position?: string;
  email?: string;
  phone?: string;
  hireDate?: string;
}

const DEPARTMENTS = ['Computer Science', 'Biology', 'Mathematics', 'Administration', 'Security', 'Academics'];
const POSITIONS = ['Professor', 'Assistant Professor', 'Lecturer', 'Administrator', 'Security Officer', 'Clerk', 'Manager', 'Director'];

export default function StaffPage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  
  // Handle authentication like profile page - only on client side
  if (typeof window !== 'undefined') {
    if (!authLoading && !token) {
      router.replace('/login');
      return <div className="text-center text-kmuGreen">Redirecting to login...</div>;
    }
    
    if (authLoading) {
      return <div className="text-center text-kmuGreen">Loading...</div>;
    }
  }

  const [staff, setStaff] = useState<Staff[]>([]);
  const [staffId, setStaffId] = useState('');
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('');
  const [position, setPosition] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [hireDate, setHireDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [positionFilter, setPositionFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [offlineMode, setOfflineMode] = useState(false);
  const { apiCall, isLoading: apiLoading, error: apiError } = useOfflineApi();

  async function loadStaff(pageNum = page) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('page', pageNum.toString());
      params.append('limit', limit.toString());
      
      if (search) {
        params.append('search', search);
      }
      if (departmentFilter) {
        params.append('department', departmentFilter);
      }
      if (positionFilter) {
        params.append('position', positionFilter);
      }
      
      const response = await apiCall<{staff: Staff[], total: number}>('get', `/staff?${params.toString()}`);
      const data = response.data;
      setStaff(data.staff);
      setTotal(data.total);
      setOfflineMode(response.offline);
    } catch (err: any) {
      setError(err?.message || 'Network error, please try again');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStaff(page);
    // eslint-disable-next-line
  }, [apiCall, page, limit, search, departmentFilter, positionFilter]);

  // Auto-clear success message
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const staffMember: Staff = { staffId, fullName, department, position, email, phone, hireDate };
      await create('staff', staffMember);
      setStaffId(''); setFullName(''); setDepartment(''); setPosition(''); setEmail(''); setPhone(''); setHireDate('');
      setSuccess('Staff member added successfully!');
      loadStaff();
    } catch (err: any) {
      setError(err?.message || 'Network error, please try again');
    } finally {
      setLoading(false);
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Clear previous messages
    setError(null);
    setSuccess(null);
    setLoading(true);
    
    try {
      // Validate file type
      const validExtensions = ['.csv', '.xls', '.xlsx'];
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      
      if (!validExtensions.includes(fileExtension)) {
        setError(`Unsupported file type: ${fileExtension}. Please upload a CSV (.csv) or Excel (.xls, .xlsx) file.`);
        setLoading(false);
        return;
      }
      
      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        setError(`File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum size is 5MB.`);
        setLoading(false);
        return;
      }
      
      let staffToImport: Staff[] = [];
      let validationErrors: string[] = [];
      let rowNumber = 1; // Start from 1 for user-friendly row numbers
      
      if (file.name.endsWith('.csv')) {
        const text = await file.text();
        const parsed = Papa.parse(text, { 
          header: true, 
          skipEmptyLines: true,
          transformHeader: (header) => header.trim()
        });
        
        // Validate headers
        const headers = Object.keys(parsed.data[0] || {});
        const requiredHeaders = ['staffId', 'fullName', 'department'];
        const missingHeaders = requiredHeaders.filter(h => 
          !headers.some(header => 
            header.toLowerCase().includes(h.toLowerCase())
          )
        );
        
        if (missingHeaders.length > 0) {
          setError(`Missing required columns: ${missingHeaders.join(', ')}. Please include: staffId, fullName, department`);
          setLoading(false);
          return;
        }
        
        staffToImport = parsed.data.map((row: any, index: number) => {
          rowNumber = index + 2; // +2 because index starts at 0 and we have header row
          
          const staffMember = {
            staffId: (row.staffId || row.StaffId || row.ID || row.id || '').toString().trim(),
            fullName: (row.fullName || row.FullName || row.Name || row.name || '').toString().trim(),
            department: (row.department || row.Department || '').toString().trim(),
            position: (row.position || row.Position || '').toString().trim(),
            email: (row.email || row.Email || '').toString().trim(),
            phone: (row.phone || row.Phone || '').toString().trim(),
            hireDate: (row.hireDate || row.HireDate || row.hire_date || '').toString().trim(),
          };
          
          // Validate required fields
          if (!staffMember.staffId) {
            validationErrors.push(`Row ${rowNumber}: Missing Staff ID`);
          } else if (staffMember.staffId.length < 3) {
            validationErrors.push(`Row ${rowNumber}: Staff ID too short (minimum 3 characters)`);
          }
          
          if (!staffMember.fullName) {
            validationErrors.push(`Row ${rowNumber}: Missing Full Name`);
          } else if (staffMember.fullName.length < 2) {
            validationErrors.push(`Row ${rowNumber}: Full Name too short (minimum 2 characters)`);
          }
          
          if (!staffMember.department) {
            validationErrors.push(`Row ${rowNumber}: Missing Department`);
          }
          
          return staffMember;
        });
      } else {
        // Excel file
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet);
        
        // Validate headers
        const headers = Object.keys(jsonData[0] || {});
        const requiredHeaders = ['staffId', 'fullName', 'department'];
        const missingHeaders = requiredHeaders.filter(h => 
          !headers.some(header => 
            header.toLowerCase().includes(h.toLowerCase())
          )
        );
        
        if (missingHeaders.length > 0) {
          setError(`Missing required columns: ${missingHeaders.join(', ')}. Please include: staffId, fullName, department`);
          setLoading(false);
          return;
        }
        
        staffToImport = jsonData.map((row: any, index: number) => {
          rowNumber = index + 2; // +2 because index starts at 0 and we have header row
          
          const staffMember = {
            staffId: (row.staffId || row.StaffId || row.ID || row.id || '').toString().trim(),
            fullName: (row.fullName || row.FullName || row.Name || row.name || '').toString().trim(),
            department: (row.department || row.Department || '').toString().trim(),
            position: (row.position || row.Position || '').toString().trim(),
            email: (row.email || row.Email || '').toString().trim(),
            phone: (row.phone || row.Phone || '').toString().trim(),
            hireDate: (row.hireDate || row.HireDate || row.hire_date || '').toString().trim(),
          };
          
          // Validate required fields
          if (!staffMember.staffId) {
            validationErrors.push(`Row ${rowNumber}: Missing Staff ID`);
          } else if (staffMember.staffId.length < 3) {
            validationErrors.push(`Row ${rowNumber}: Staff ID too short (minimum 3 characters)`);
          }
          
          if (!staffMember.fullName) {
            validationErrors.push(`Row ${rowNumber}: Missing Full Name`);
          } else if (staffMember.fullName.length < 2) {
            validationErrors.push(`Row ${rowNumber}: Full Name too short (minimum 2 characters)`);
          }
          
          if (!staffMember.department) {
            validationErrors.push(`Row ${rowNumber}: Missing Department`);
          }
          
          return staffMember;
        });
      }
      
      // Check for validation errors
      if (validationErrors.length > 0) {
        setError(`Validation errors found:\n${validationErrors.slice(0, 5).join('\n')}${validationErrors.length > 5 ? `\n...and ${validationErrors.length - 5} more errors` : ''}`);
        setLoading(false);
        return;
      }
      
      // Check for duplicate staff IDs
      const staffIds = staffToImport.map(s => s.staffId);
      const duplicateIds = staffIds.filter((id, index) => staffIds.indexOf(id) !== index);
      if (duplicateIds.length > 0) {
        setError(`Duplicate Staff IDs found: ${duplicateIds.slice(0, 5).join(', ')}${duplicateIds.length > 5 ? `...and ${duplicateIds.length - 5} more` : ''}`);
        setLoading(false);
        return;
      }
      
      // Import staff members
      const results = await Promise.allSettled(
        staffToImport.map(staffMember => create('staff', staffMember))
      );
      
      const successfulImports = results.filter(result => result.status === 'fulfilled').length;
      const failedImports = results.filter(result => result.status === 'rejected').length;
      
      if (failedImports > 0) {
        setError(`${failedImports} staff members failed to import. ${successfulImports} imported successfully.`);
      } else {
        setSuccess(`${successfulImports} staff members imported successfully!`);
      }
      
      loadStaff();
    } catch (err: any) {
      setError(err?.message || 'Failed to import staff members');
    } finally {
      setLoading(false);
      // Reset file input
      e.target.value = '';
    }
  }

  async function handleDelete(staffId: string) {
    if (!window.confirm('Are you sure you want to delete this staff member?')) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await remove('staff', staffId);
      setSuccess('Staff member deleted successfully!');
      loadStaff();
    } catch (err: any) {
      setError(err?.message || 'Network error, please try again');
    } finally {
      setLoading(false);
    }
  }

  function toggleSelect(staffId: string) {
    setSelected(prev => 
      prev.includes(staffId) 
        ? prev.filter(id => id !== staffId) 
        : [...prev, staffId]
    );
  }

  function toggleSelectAll() {
    setSelected(selected.length === staff.length ? [] : staff.map(s => s.staffId));
  }

  async function handleBulkDelete() {
    if (selected.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selected.length} staff member(s)?`)) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await Promise.all(selected.map(id => remove('staff', id)));
      setSelected([]);
      setSuccess(`${selected.length} staff member(s) deleted successfully!`);
      loadStaff();
    } catch (err: any) {
      setError(err?.message || 'Network error, please try again');
    } finally {
      setLoading(false);
    }
  }

  // Filter staff for search
  const filteredStaff = staff.filter(s => 
    s.fullName?.toLowerCase().includes(search.toLowerCase()) ||
    s.staffId?.toLowerCase().includes(search.toLowerCase()) ||
    s.department?.toLowerCase().includes(search.toLowerCase()) ||
    s.position?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <section className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-kmuGreen">Staff Management</h1>
        {offlineMode && (
          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">
            Offline Mode
          </span>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md mb-6">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Add Staff Form */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 text-kmuOrange">Add New Staff Member</h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label htmlFor="staffId" className="block text-sm font-medium mb-1">Staff ID *</label>
                <input
                  id="staffId"
                  type="text"
                  value={staffId}
                  onChange={(e) => setStaffId(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium mb-1">Full Name *</label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="department" className="block text-sm font-medium mb-1">Department *</label>
                <select
                  id="department"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                >
                  <option value="">Select Department</option>
                  {DEPARTMENTS.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="position" className="block text-sm font-medium mb-1">Position</label>
                <select
                  id="position"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select Position</option>
                  {POSITIONS.map(pos => (
                    <option key={pos} value={pos}>{pos}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-1">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="staff@kmu.ac.zm"
                />
              </div>
              
              <div>
                <label htmlFor="phone" className="block text-sm font-medium mb-1">Phone</label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="+260..."
                />
              </div>
              
              <div>
                <label htmlFor="hireDate" className="block text-sm font-medium mb-1">Hire Date</label>
                <input
                  id="hireDate"
                  type="date"
                  value={hireDate}
                  onChange={(e) => setHireDate(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-kmuGreen text-white py-2 px-4 rounded hover:bg-kmuOrange transition disabled:opacity-50"
              >
                {loading ? 'Adding...' : 'Add Staff Member'}
              </button>
            </form>
            
            {/* Import Section */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-md font-medium mb-3">Bulk Import</h3>
              <div className="space-y-3">
                <label className="block">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Upload CSV or Excel file:</span>
                  <input
                    type="file"
                    accept=".csv,.xls,.xlsx"
                    onChange={handleImport}
                    disabled={loading}
                    className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-kmuGreen file:text-white hover:file:bg-kmuOrange"
                  />
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  CSV/Excel files should include columns: staffId, fullName, department (required)
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Staff List */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            {/* Search and Filters */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search staff..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <select
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    className="border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">All Departments</option>
                    {DEPARTMENTS.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <select
                    value={positionFilter}
                    onChange={(e) => setPositionFilter(e.target.value)}
                    className="border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">All Positions</option>
                    {POSITIONS.map(pos => (
                      <option key={pos} value={pos}>{pos}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            
            {/* Bulk Actions */}
            {selected.length > 0 && (
              <div className="p-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    {selected.length} staff member(s) selected
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleBulkDelete}
                      disabled={loading}
                      className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50"
                    >
                      Delete Selected
                    </button>
                    <button
                      onClick={() => setSelected([])}
                      className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                    >
                      Clear Selection
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Staff Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="py-2 px-2 md:px-4">
                      <input 
                        type="checkbox" 
                        checked={selected.length === staff.length && staff.length > 0}
                        onChange={toggleSelectAll}
                      />
                    </th>
                    <th className="py-2 px-2 md:px-4 text-left">Staff ID</th>
                    <th className="py-2 px-2 md:px-4 text-left">Name</th>
                    <th className="py-2 px-2 md:px-4 text-left hidden md:table-cell">Department</th>
                    <th className="py-2 px-2 md:px-4 text-left hidden md:table-cell">Position</th>
                    <th className="py-2 px-2 md:px-4 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredStaff.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-4 px-4 text-center text-gray-500 dark:text-gray-400">
                        No staff members found
                      </td>
                    </tr>
                  ) : (
                    filteredStaff.map((s) => (
                      <tr key={s.staffId} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="py-2 px-2 md:px-4">
                          <input 
                            type="checkbox" 
                            checked={selected.includes(s.staffId)}
                            onChange={() => toggleSelect(s.staffId)}
                          />
                        </td>
                        <td className="py-2 px-2 md:px-4 font-medium">
                          <Link href={`/staff/${s.staffId}`} className="text-kmuGreen hover:underline">
                            {s.staffId}
                          </Link>
                        </td>
                        <td className="py-2 px-2 md:px-4">
                          <div className="font-medium">{s.fullName}</div>
                          <div className="text-xs text-gray-500 md:hidden">
                            {s.department} • {s.position || 'N/A'}
                          </div>
                        </td>
                        <td className="py-2 px-2 md:px-4 hidden md:table-cell">{s.department}</td>
                        <td className="py-2 px-2 md:px-4 hidden md:table-cell">{s.position || 'N/A'}</td>
                        <td className="py-2 px-2 md:px-4">
                          <div className="flex gap-2">
                            <Link 
                              href={`/staff/${s.staffId}`} 
                              className="text-kmuGreen hover:underline text-sm"
                            >
                              View
                            </Link>
                            <button
                              onClick={() => handleDelete(s.staffId)}
                              disabled={loading}
                              className="text-red-600 hover:text-red-800 text-sm disabled:opacity-50"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {total > limit && (
              <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} staff members
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={page * limit >= total}
                    className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}