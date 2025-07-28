"use client";
import { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../config/constants';
import { authHeaders } from '../utils/api';

interface Student {
  _id: string;
  studentId: string;
  fullName: string;
  department: string;
  year: string;
  gender: string;
}

interface SmartStudentSearchProps {
  onStudentSelect: (student: Student) => void;
  placeholder?: string;
  className?: string;
}

export default function SmartStudentSearch({ 
  onStudentSelect, 
  placeholder = "Search by name or student ID...",
  className = ""
}: SmartStudentSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm.length >= 2) {
        searchStudents(searchTerm);
      } else {
        setSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchStudents = async (query: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/students/search?q=${encodeURIComponent(query)}`, {
        headers: { ...authHeaders() }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => 
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        selectStudent(suggestions[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  };

  const selectStudent = (student: Student) => {
    setSearchTerm(student.fullName);
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    onStudentSelect(student);
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, index) => 
      regex.test(part) ? (
        <span key={index} className="bg-yellow-200 font-semibold">{part}</span>
      ) : part
    );
  };

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(suggestions.length > 0)}
          placeholder={placeholder}
          className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-kmuGreen focus:border-transparent"
        />
        {isLoading && (
          <div className="absolute right-3 top-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-kmuGreen"></div>
          </div>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((student, index) => (
            <div
              key={student._id}
              onClick={() => selectStudent(student)}
              className={`px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${
                index === selectedIndex ? 'bg-kmuGreen text-white' : ''
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className={`font-medium ${
                    index === selectedIndex ? 'text-white' : 'text-gray-900 dark:text-white'
                  }`}>
                    {highlightMatch(student.fullName, searchTerm)}
                  </div>
                  <div className={`text-sm ${
                    index === selectedIndex ? 'text-white' : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    ID: {student.studentId} • {student.department} • Year {student.year}
                  </div>
                </div>
                <div className={`text-xs px-2 py-1 rounded ${
                  index === selectedIndex 
                    ? 'bg-white text-kmuGreen' 
                    : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                }`}>
                  {student.gender}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showSuggestions && suggestions.length === 0 && searchTerm.length >= 2 && !isLoading && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg p-3">
          <div className="text-gray-500 dark:text-gray-400 text-center">
            No students found matching "{searchTerm}"
          </div>
        </div>
      )}
    </div>
  );
} 