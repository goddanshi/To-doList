const express = require ('express');
const app = express();
const port = 3000;
const path = require('path')
const db = require ('./database.js')
const chatRouter = require('./chat.js');
app.use(chatRouter); // подключаем роуты из chat.js
app.use(express.json()) // for parsing application/json
app.use(express.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded
app.use(express.static(path.join(__dirname, 'views')));
app.set('view engine', 'ejs');// Устанавливаем EJS как движок шаблонов
app.set('views', path.join(__dirname, 'views'));

app.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM public.tasks');
    const arraytask = result.rows;
    res.render('index', {
      arraytask: arraytask
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка сервера');
  }
});

app.post('/', (req,res) => {
  newtask = req.body.newtask;
  if (newtask == '') {
    return res.send('<script>alert("Задача не может быть пустая"); window.location.href = "/";</script>');
  } else {
    db.query('INSERT INTO tasks (task) VALUES ($1) RETURNING *' , [newtask]) 
    res.redirect ('/')
}});

app.post('/delete/:id', async (req,res)=>{
  const id = req.params.id;
  await db.query('DELETE FROM tasks WHERE id = $1', [id]);
  res.redirect ('/');
})

app.post('/update/:id', async (req, res) => {
  const updatetask = req.body.updatetask;
  const taskId = req.params.id;

  if (!updatetask || updatetask.trim() === '') {
    return res.send('<script>alert("Задача не может быть пустой"); window.location.href = "/";</script>');
  }
  try {
    await db.query(
      'UPDATE tasks SET task = $1 WHERE id = $2 RETURNING *',
      [updatetask, taskId]
    );
    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка при обновлении задачи');
  }
});

app.listen(3000,()=>{
  console.log('server has been started')
});

