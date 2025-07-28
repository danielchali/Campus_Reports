const { app } = require('electron').remote || require('electron');
const path = require('path');
const { Low, JSONFile } = require('lowdb');

const dbPath = path.join(
    (app || require('electron').app).getPath('userData'),
    'students.json'
);
const adapter = new JSONFile(dbPath);
const db = new Low(adapter);

async function init() {
    await db.read();
    if (!db.data) db.data = { students: [] };
    await db.write();
}

async function getStudents() {
    await init();
    return db.data.students;
}

async function addStudent(student) {
    await init();
    db.data.students.push(student);
    await db.write();
}

async function updateStudent(id, updates) {
    await init();
    const idx = db.data.students.findIndex(s => s.id === id || s._id === id);
    if (idx !== -1) {
        db.data.students[idx] = {...db.data.students[idx], ...updates };
        await db.write();
    }
}

async function deleteStudent(id) {
    await init();
    db.data.students = db.data.students.filter(s => s.id !== id && s._id !== id);
    await db.write();
}

module.exports = { getStudents, addStudent, updateStudent, deleteStudent };