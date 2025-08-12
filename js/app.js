// Constantes DB
const DB_NAME = "projectsDB";
const DB_VERSION = 3;
let db = null;
 
const form = document.getElementById('project-form');
const inputId = document.getElementById('project-id');
const inputName = document.getElementById('project-name');
const projectList = document.getElementById('project-list');

//Toasts
function showToast(msg, duration = 2500) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.append(t);
  setTimeout(() => {
    t.classList.add('hide');
    t.addEventListener('transitionend', () => t.remove());
  }, duration);
}

//Ouvre / actualise IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = e => {
    const _db = e.target.result;

    if (e.oldVersion < 1) {
        _db.createObjectStore('projects', { keyPath: 'id', autoIncrement: true });
    }
    if (e.oldVersion < 2) {
      const store = _db.createObjectStore('tasks', { keyPath: 'id', autoIncrement: true });
      store.createIndex('by_project', 'projectId', { unique: false });
    }      
  };

    req.onsuccess = e => resolve(e.target.result);
    req.onerror = e => reject(e.target.error);
  });
}

// CRUD projets
function addProject(proj) { //Ajouter projet
  return new Promise((res, rej) => {
    const tx = db.transaction('projects','readwrite');
    const store = tx.objectStore('projects');
    const r = store.add(proj);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

function getAllProjects() { //récupère tous les projets
  return new Promise((res, rej) => {
    const tx = db.transaction('projects','readonly');
    const store = tx.objectStore('projects');
    const r = store.getAll();
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

function updateProject(proj) { // Modifier/actualiser projet
  return new Promise((res, rej) => {
    const tx = db.transaction('projects','readwrite');
    const store = tx.objectStore('projects');
    const r = store.put(proj);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

function deleteProject(id) { //Supprimer projet
  return new Promise((res, rej) => {
    const tx = db.transaction('projects','readwrite');
    const store = tx.objectStore('projects');
    const r = store.delete(id);
    r.onsuccess = () => res();
    r.onerror = () => rej(r.error);
  });
}

// CRUD tâches
function addTask(task) { //Ajouter tâche
  return new Promise((res, rej) => {
    const tx = db.transaction('tasks','readwrite');
    const store = tx.objectStore('tasks');
    const r = store.add(task);
    r.onsuccess = () => res();
    r.onerror = () => rej(r.error);
  });
}

function getTaskByProjectId(pid) { //Récupère tâche
  return new Promise((res, rej) => {
    const tx = db.transaction('tasks','readonly');
    const store = tx.objectStore('tasks');
    const idx = store.index('by_project');
    const r = idx.getAll(pid);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

function updateTask(task) { //Modifier tâche
  return new Promise((res, rej) => {
    const tx = db.transaction('tasks','readwrite');
    const store = tx.objectStore('tasks');
    const r = store.put(task);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

function deleteTask(id) { //Supprimer tâche
  return new Promise((res, rej) => {
    const tx = db.transaction('tasks','readwrite');
    const store = tx.objectStore('tasks');
    const r = store.delete(id);
    r.onsuccess = () => res();
    r.onerror = () => rej(r.error);
  });
}

// Affiche tous les projets
async function renderProjects() {
  projectList.innerHTML = '';
  const projects = await getAllProjects();
  projects.forEach(proj => {
    const li = document.createElement('li');
    li.textContent = `${proj.name}`;     

// Toggle tâches
const toggleBtn = document.createElement('button');
toggleBtn.setAttribute("class", "addTask");
toggleBtn.textContent = '+ Voir / Ajouter tâche';
toggleBtn.onclick = async () => {
  let cont = li.querySelector('.tasks-container');
  if (!cont) cont = createTasksContainer(li, proj.id);
  if (cont.style.display === 'none') {
    cont.style.display = 'block';
    await renderTasks(proj.id, cont.querySelector('ul'));
    toggleBtn.textContent = '-';
    } else {
      cont.style.display = 'none';
      toggleBtn.textContent = '+ Voir / Ajouter tâche';
      }
};

// Edition projet
const editProj = document.createElement('button');
editProj.textContent = 'Modifier';
editProj.onclick = () => {
  inputId.value = proj.id;
  inputName.value = proj.name;
};

// Supprime projet
const delProj = document.createElement('button');
delProj.textContent = 'Supprimer';
delProj.onclick = async () => {
  await deleteProject(proj.id);
  showToast('Projet supprimé');
  await renderProjects();
  };

li.prepend(toggleBtn);
li.append(editProj, delProj);
projectList.append(li);
  });
}

// Création du container et formulaire de tâches
function createTasksContainer(parentLi, projectId) {
  const container = document.createElement('div');
  container.className = 'tasks-container';
  container.style.display = 'none';
  container.style.margin = '0.5em 0';

  const ul = document.createElement('ul');
  ul.style.paddingLeft = '1.2em';
  container.append(ul);

  const formTask = document.createElement('form');
  formTask.innerHTML = `
    <input type="hidden" class="task-id" />
    <input type="text" class="task-name" placeholder="Tâche" required />
    <input type="date" class="task-deadline" required />
    <button type="submit">Enregistrer</button>
  `;
  container.append(formTask);

  formTask.addEventListener('submit', async e => {
    e.preventDefault();
    const idField   = formTask.querySelector('.task-id');
    const nameField = formTask.querySelector('.task-name');
    const dateField = formTask.querySelector('.task-deadline');
     
    const id = Number(idField.value);
    const name = nameField.value.trim();
    const deadline = dateField.value;    

    if (!name || !deadline) return;

    if (id) {
      await updateTask({ id, projectId, name, deadline });
      showToast('Bien modifié');
    } else {
      await addTask({ projectId, name, deadline });
      showToast('Bien ajouté');
    }

    formTask.reset();
    await renderTasks(projectId, ul);
  });

  parentLi.append(container);
  return container;
}

// Affiche les tâches d’un projet
async function renderTasks(projectId, tasksUl) {
  tasksUl.innerHTML = '';
  const tasks = await getTaskByProjectId(projectId);

  tasks.forEach(task => {
    const li = document.createElement('li');

    // Switch (Checkbox) task done
    const doneChk = document.createElement('input');
    doneChk.type = 'checkbox';
    doneChk.classList.add('task-done');
    doneChk.checked = task.done;
    doneChk.onchange = async () => {
      await updateTask({ ...task, done: doneChk.checked });
      showToast('Tâche mise à jour');
      await renderTasks(projectId, tasksUl);
    };

    // Nom + deadline
    // Formatage de la date au format français
    let formattedDeadline = '';
    if (task.deadline) {
      const date = new Date(task.deadline);
      formattedDeadline = date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
    }  

  const nameSpan = document.createElement('div');
  nameSpan.classList.add('header-card');

// Vérifie la deadline
let alertMsg = '';
if (!task.done && task.deadline) {
  const today = new Date();
  const deadlineDate = new Date(task.deadline);
  const diffTime = deadlineDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 5 && diffDays >= 0) {
    alertMsg = `<span class="deadline-alert">🔥 Échéance dans ${diffDays} jour(s) !</span>`;
  } else if (diffDays < 0) {
    alertMsg = `<span class="deadline-alert overdue">🚨 En retard de ${Math.abs(diffDays)} jour(s)</span>`;
  }
}

// Construction HTML
nameSpan.innerHTML = `
  <p>${task.name}</p>
  <span class="deadline">Deadline : ${formattedDeadline}</span>
  ${alertMsg}
`;

// Style visuel si terminé (tâche barrée)
if (task.done) {
  nameSpan.style.textDecoration = 'line-through';
  nameSpan.style.color = '#888';
}


// Modifier tâche
const editBtn = document.createElement('button');
editBtn.textContent = 'Modifier';
editBtn.onclick = () => {
  const container = editBtn.closest('.tasks-container');
  const formTask  = container.querySelector('form');

  formTask.querySelector('.task-id').value       = task.id;
  formTask.querySelector('.task-name').value     = task.name;
  formTask.querySelector('.task-deadline').value = task.deadline;       

  container.style.display = 'block';
  container.parentElement.querySelector('button').textContent = '-';
};

// Supprimer tâche
const delBtn = document.createElement('button');
delBtn.textContent = 'X';
delBtn.onclick = async () => {
  await deleteTask(task.id);
  showToast('Tâche supprimée');
  await renderTasks(projectId, tasksUl);
  };

  li.append(doneChk, nameSpan, editBtn, delBtn);
  tasksUl.append(li);
  });
}

// Submit du formulaire projet
async function onFormSubmit(e) {
  e.preventDefault();
  const name = inputName.value.trim();
  const id = Number(inputId.value);

  if (!name) return;
  if (id) {
    await updateProject({ id, name });
    showToast('Projet modifié');
  } else {
    await addProject({ name });
    showToast('Projet ajouté');
  }

  form.reset();
  await renderProjects();
}

/////////////////////////////Export des données
//////JSON
async function exportToJSON() {
try {
  const projects = await getAllProjects();
  const tx = db.transaction('tasks', 'readonly');
  const taskStore = tx.objectStore('tasks');
  const taskRequest = taskStore.getAll();

  taskRequest.onsuccess = () => {
    const tasks = taskRequest.result;

    const exportObj = {
      projects,
      tasks
    };

    const jsonStr = JSON.stringify(exportObj, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'export_projects_tasks.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  taskRequest.onerror = () => {
    showToast('Erreur export des tâches.');
  };

  } catch (err) {
    console.error('Erreur export JSON :', err);
    showToast('Erreur export JSON.');
  }
}

///////PDF
async function exportToPDF() {
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let y = 10;

    const projects = await getAllProjects();

    for (const project of projects) {
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 180);
      doc.text(`Projet : ${project.name}`, 10, y);
      y += 8;

      const tasks = await getTaskByProjectId(project.id);
      if (tasks.length === 0) {
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text('Aucune tâche', 15, y);
        y += 6;
        continue;
      }

      for (const task of tasks) {
        const deadline = task.deadline
          ? new Date(task.deadline).toLocaleDateString('fr-FR')
          : '—';
        const done = task.done ? '✨' : '⚡';
        const taskText = `${done} ${task.name} (Deadline : ${deadline})`;

        doc.setFontSize(11);
        doc.setTextColor(50);
        doc.text(taskText, 15, y);
        y += 6;

        // Si on atteint le bas de la page
        if (y > 280) {
          doc.addPage();
          y = 10;
        }
      }

      y += 6; // espace entre projets
    }

    doc.save('export_projects_tasks.pdf');
  } catch (err) {
    console.error('Erreur export PDF :', err);
    showToast('Erreur export PDF.');
  }
}


// Init formulaire/db
async function init() {
  document.getElementById('export-json-btn').addEventListener('click', exportToJSON);
  document.getElementById('export-pdf-btn').addEventListener('click', exportToPDF);


  try {
    db = await openDB();
    await renderProjects();
    form.addEventListener('submit', onFormSubmit);
    } catch (err) {
      console.error('Erreur DB :', err);
    }
}

document.addEventListener('DOMContentLoaded', init);