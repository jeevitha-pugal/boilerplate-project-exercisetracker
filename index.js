const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose')
require('dotenv').config()

app.use(cors())
app.use(express.static('public'))
app.use(express.urlencoded({ extended: false }))
app.use(express.json())

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log('MongoDB connection error:', err.message))

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  log: [
    {
      description: String,
      duration: Number,
      date: Date
    }
  ]
})

const User = mongoose.model('User', userSchema)

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
})

app.post('/api/users', async (req, res) => {
  try {
    const username = req.body.username

    if (!username) {
      return res.status(400).json({ error: 'username is required' })
    }

    const existingUser = await User.findOne({ username })

    if (existingUser) {
      return res.json({
        username: existingUser.username,
        _id: existingUser._id
      })
    }

    const user = new User({
      username
    })

    const savedUser = await user.save()

    res.json({
      username: savedUser.username,
      _id: savedUser._id
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({})

    res.json(
      users.map(user => ({
        username: user.username,
        _id: user._id
      }))
    )
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    const user = await User.findById(req.params._id)

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const description = req.body.description
    const duration = Number(req.body.duration)

    let date

    if (req.body.date) {
      date = new Date(req.body.date)
    } else {
      date = new Date()
    }

    if (!description || isNaN(duration) || isNaN(date.getTime())) {
      return res.status(400).json({ error: 'Invalid exercise data' })
    }

    user.log.push({
      description,
      duration,
      date
    })

    await user.save()

    res.json({
      username: user.username,
      description,
      duration,
      date: date.toDateString(),
      _id: user._id
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const user = await User.findById(req.params._id)

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    let exercises = [...user.log]

    if (req.query.from) {
      const fromDate = new Date(req.query.from)
      fromDate.setHours(0, 0, 0, 0)

      exercises = exercises.filter(exercise => {
        return exercise.date >= fromDate
      })
    }

    if (req.query.to) {
      const toDate = new Date(req.query.to)
      toDate.setHours(23, 59, 59, 999)

      exercises = exercises.filter(exercise => {
        return exercise.date <= toDate
      })
    }

    if (req.query.limit) {
      const limit = parseInt(req.query.limit)

      if (!isNaN(limit)) {
        exercises = exercises.slice(0, limit)
      }
    }

    const log = exercises.map(exercise => ({
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString()
    }))

    res.json({
      username: user.username,
      count: log.length,
      _id: user._id,
      log
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})