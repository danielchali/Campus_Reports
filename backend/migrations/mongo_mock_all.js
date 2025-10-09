import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import bcrypt from 'bcryptjs';

import User from '../models/user.js';
import Student from '../models/student.js';
import Case from '../models/case.js';

const users = [
    { username: 'admin', password: 'password', name: 'Admin User', role: 'admin' },
    { username: 'chief_security', password: 'password', name: 'Chief Security Officer', role: 'chief_security_officer' },
    { username: 'dean', password: 'password', name: 'Dean of Students', role: 'dean_of_students' },
    { username: 'assistant_dean', password: 'password', name: 'Assistant Dean', role: 'assistant_dean' },
    { username: 'secretary', password: 'password', name: 'Secretary', role: 'secretary' },
    { username: 'security', password: 'password', name: 'Security Officer', role: 'security_officer' }
];

const students = [
    { studentId: 'S1001', fullName: 'Alice Johnson', department: 'Computer Science', year: '3', gender: 'Female' },
    { studentId: 'S1002', fullName: 'Bob Smith', department: 'Biology', year: '2', gender: 'Male' },
    { studentId: 'S1003', fullName: 'Carol Lee', department: 'Mathematics', year: '4', gender: 'Female' }
];

const cases = [
    { student_id: 'S1001', incident_date: '2024-05-01', description: 'Cheating on exam', offense_type: 'Academic Dishonesty', severity: 'High', status: 'Open', sanctions: 'Suspension', created_by: 'admin' },
    { student_id: 'S1002', incident_date: '2024-04-15', description: 'Disruptive behavior in class', offense_type: 'Misconduct', severity: 'Medium', status: 'Closed', sanctions: 'Warning', created_by: 'security' },
    { student_id: 'S1003', incident_date: '2024-03-20', description: 'Plagiarism in assignment', offense_type: 'Academic Dishonesty', severity: 'High', status: 'Open', sanctions: 'Probation', created_by: 'academic' }
];

async function insertMockData() {
    try {
        await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
        await User.deleteMany({});
        await Student.deleteMany({});
        await Case.deleteMany({});
        // Hash passwords for all users
        for (let user of users) {
            user.password = await bcrypt.hash(user.password, 10);
            console.log(`Prepared user: ${user.username}, hashed password: ${user.password}`);
        }
        await User.insertMany(users);
        const insertedUsers = await User.find({}, '-password');
        console.log('Inserted users:', insertedUsers);
        await Student.insertMany(students);
        await Case.insertMany(cases);
        console.log('Mock data inserted successfully!');
    } catch (err) {
        console.error('Error inserting mock data:', err);
    } finally {
        await mongoose.disconnect();
    }
}

insertMockData();