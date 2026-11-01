const express = require('express');
const cookieParser = require('cookie-parser');

const logger = require('./middleware/logger');
const validate = require('./middleware/validate');
const { HttpError, notFound, errorHandler } = require('./middleware/errors');

const app = express();
const PORT = process.env.PORT || 3000;

// Copied categories from the json file
const MUSCLE_GROUPS = ['chest', 'legs', 'back', 'shoulders', 'arms', 'core'];
const EQUIPMENT = ['bodyweight', 'barbell', 'dumbbell', 'machine', 'cable', 'kettlebell'];
const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'];

// Data storage
const exercises = require('./data/exercises.json');
const workoutLog = [];
let nextLogId = 1;

app.use(logger);
app.use(express.json());
app.use(cookieParser());

function findExercise(idParam) {
    const id = Number(idParam);
    if (!Number.isInteger(id) || id < 1) {
        throw new HttpError(400, 'Exercise id must be a positive whole number');
    }
    const exercise = exercises.find((e) => e.id === id);
    if (!exercise) {
        throw new HttpError(404, `No exercise found with id ${id}`);
    }
    return exercise;
}

app.get('/', (req, res) => {
    res.json({
        message: 'Exercise API',
        endpoints: [
            'GET /api/exercises?muscle=&equipment=&difficulty=',
            'GET /api/exercises/:id',
            'POST /api/exercises',
            'GET /api/muscle-groups',
            'GET /api/workout/random?muscle=&count=',
            'GET /api/log?exerciseId=',
            'POST /api/log',
            'GET /api/stats'
        ]
    });
});

app.get('/visit-count', (req, res) => {
    const visits = (parseInt(req.cookies.visits, 10) || 0) + 1;
    res.cookie('visits', visits, { maxAge: 24 * 60 * 60 * 1000, httpOnly: true });
    res.json({ visits });
});

// Adds a new exercise to the list of exercises
app.get('/api/exercises', (req, res) => {
    const { muscle, equipment, difficulty } = req.query;
    let results = exercises;

    if (muscle) results = results.filter((e) => e.muscleGroup === muscle.toLowerCase());
    if (equipment) results = results.filter((e) => e.equipment === equipment.toLowerCase());
    if (difficulty) results = results.filter((e) => e.difficulty === difficulty.toLowerCase());

    res.json({ count: results.length, exercises: results });
});

app.get('/api/exercises/:id', (req, res) => {
    res.json(findExercise(req.params.id));
});

app.post(
    '/api/exercises',
    validate({
        name: { type: 'string', required: true },
        muscleGroup: { type: 'string', required: true, oneOf: MUSCLE_GROUPS },
        equipment: { type: 'string', required: true, oneOf: EQUIPMENT },
        difficulty: { type: 'string', required: true, oneOf: DIFFICULTIES },
        instructions: { type: 'string', required: false }
    }),
    (req, res) => {
        const { name, muscleGroup, equipment, difficulty, instructions } = req.body;

        const duplicate = exercises.some((e) => e.name.toLowerCase() === name.trim().toLowerCase());
        if (duplicate) {
            throw new HttpError(409, `An exercise named "${name.trim()}" already exists`);
        }

        const exercise = {
            id: Math.max(0, ...exercises.map((e) => e.id)) + 1,
            name: name.trim(),
            muscleGroup: muscleGroup.toLowerCase(),
            equipment: equipment.toLowerCase(),
            difficulty: difficulty.toLowerCase(),
            instructions: instructions ? instructions.trim() : ''
        };
        exercises.push(exercise);
        res.status(201).json(exercise);
    }
);

app.get('/api/muscle-groups', (req, res) => {
    const groups = MUSCLE_GROUPS.map((group) => ({
        muscleGroup: group,
        exerciseCount: exercises.filter((e) => e.muscleGroup === group).length
    }));
    res.json(groups);
});

app.get('/api/workout/random', (req, res) => {
    const { muscle } = req.query;
    const count = req.query.count === undefined ? 4 : Number(req.query.count);

    if (!Number.isInteger(count) || count < 1 || count > 10) {
        throw new HttpError(400, 'count must be a whole number between 1 and 10');
    }

    let pool = exercises;
    if (muscle) pool = pool.filter((e) => e.muscleGroup === muscle.toLowerCase());
    if (pool.length === 0) {
        throw new HttpError(404, `No exercises found for muscle group "${muscle}"`);
    }

    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const workout = shuffled.slice(0, count);

    res.json({ count: workout.length, workout });
});


app.get('/api/log', (req, res) => {
    let entries = workoutLog;
    if (req.query.exerciseId !== undefined) {
        const exercise = findExercise(req.query.exerciseId);
        entries = entries.filter((entry) => entry.exerciseId === exercise.id);
    }
    res.json({ count: entries.length, entries });
});

app.post(
    '/api/log',
    validate({
        exerciseId: { type: 'number', required: true, integer: true, min: 1 },
        sets: { type: 'number', required: true, integer: true, min: 1 },
        reps: { type: 'number', required: true, integer: true, min: 1 },
        weight: { type: 'number', required: true, min: 0 },
        notes: { type: 'string', required: false }
    }),
    (req, res) => {
        const { exerciseId, sets, reps, weight, notes } = req.body;
        const exercise = findExercise(exerciseId);

        const entry = {
            id: nextLogId++,
            exerciseId: exercise.id,
            exerciseName: exercise.name,
            sets,
            reps,
            weight,
            notes: notes ? notes.trim() : '',
            loggedAt: new Date().toISOString()
        };
        workoutLog.push(entry);
        res.status(201).json(entry);
    }
);

app.get('/api/stats', (req, res) => {
    const totalVolume = workoutLog.reduce((sum, e) => sum + e.sets * e.reps * e.weight, 0);
    const totalSets = workoutLog.reduce((sum, e) => sum + e.sets, 0);

    // Count sets per muscle group to find the most trained one
    const setsByMuscle = {};
    for (const entry of workoutLog) {
        const group = exercises.find((e) => e.id === entry.exerciseId).muscleGroup;
        setsByMuscle[group] = (setsByMuscle[group] || 0) + entry.sets;
    }
    const mostTrained = Object.entries(setsByMuscle).sort((a, b) => b[1] - a[1])[0];

    res.json({
        entriesLogged: workoutLog.length,
        totalSets,
        totalVolume,
        setsByMuscle,
        mostTrainedMuscleGroup: mostTrained ? mostTrained[0] : null
    });
});


app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
