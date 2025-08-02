
  // Constantes DB
  const DB_NAME    = "projectsDB";
  const DB_VERSION = 3;
  let db = null;

  // DOM refs
  const form        = document.getElementById('project-form');
  const inputId     = document.getElementById('project-id');
  const inputName   = document.getElementById('project-name');
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

         ////Migration DB pour éviter les incompatibilités de versions à l'enregistretement
        if (e.oldVersion < 1) {
          db.createObjectStore('projects', { keyPath: 'id', autoIncrement: true });
        }
        if (e.oldVersion < 2) {
          const store = db.createObjectStore('tasks', { keyPath: 'id', autoIncrement: true });
          store.createIndex('by_project', 'projectId', { unique: false });
        }
        ////Ouvre les tables relatives à projects et tasks
        if (!_db.objectStoreNames.contains('projects')) {
          _db.createObjectStore('projects', { keyPath: 'id', autoIncrement: true });
        }
        if (!_db.objectStoreNames.contains('tasks')) {
          const store = _db.createObjectStore('tasks', { keyPath: 'id', autoIncrement: true });
          store.createIndex('by_project', 'projectId', { unique: false });
        }
      };

      req.onsuccess = e => resolve(e.target.result);
      req.onerror   = e => reject(e.target.error);
    });
  }

  // CRUD projets
  function addProject(proj) {
    return new Promise((res, rej) => {
      const tx    = db.transaction('projects','readwrite');
      const store = tx.objectStore('projects');
      const r     = store.add(proj);
      r.onsuccess = () => res(r.result);
      r.onerror   = () => rej(r.error);
    });
  }
  function getAllProjects() {
    return new Promise((res, rej) => {
      const tx    = db.transaction('projects','readonly');
      const store = tx.objectStore('projects');
      const r     = store.getAll();
      r.onsuccess = () => res(r.result);
      r.onerror   = () => rej(r.error);
    });
  }
  function updateProject(proj) {
    return new Promise((res, rej) => {
      const tx    = db.transaction('projects','readwrite');
      const store = tx.objectStore('projects');
      const r     = store.put(proj);
      r.onsuccess = () => res(r.result);
      r.onerror   = () => rej(r.error);
    });
  }
  function deleteProject(id) {
    return new Promise((res, rej) => {
      const tx    = db.transaction('projects','readwrite');
      const store = tx.objectStore('projects');
      const r     = store.delete(id);
      r.onsuccess = () => res();
      r.onerror   = () => rej(r.error);
    });
  }

  // CRUD tâches
  function addTask(task) {
    return new Promise((res, rej) => {
      const tx    = db.transaction('tasks','readwrite');
      const store = tx.objectStore('tasks');
      const r     = store.add(task);
      r.onsuccess = () => res();
      r.onerror   = () => rej(r.error);
    });
  }
  function getTaskByProjectId(pid) {
    return new Promise((res, rej) => {
      const tx    = db.transaction('tasks','readonly');
      const store = tx.objectStore('tasks');
      const idx   = store.index('by_project');
      const r     = idx.getAll(pid);
      r.onsuccess = () => res(r.result);
      r.onerror   = () => rej(r.error);
    });
  }
  function updateTask(task) {
    return new Promise((res, rej) => {
      const tx    = db.transaction('tasks','readwrite');
      const store = tx.objectStore('tasks');
      const r     = store.put(task);
      r.onsuccess = () => res(r.result);
      r.onerror   = () => rej(r.error);
    });
  }
  function deleteTask(id) {
    return new Promise((res, rej) => {
      const tx    = db.transaction('tasks','readwrite');
      const store = tx.objectStore('tasks');
      const r     = store.delete(id);
      r.onsuccess = () => res();
      r.onerror   = () => rej(r.error);
    });
  }

  // Affiche tous les projets
  async function renderProjects() {
    projectList.innerHTML = '';
    const projects = await getAllProjects();
    projects.forEach(proj => {
      const li = document.createElement('li');
      li.textContent = `${proj.name}`;

      const goalPourcentage = document.createElement('div');
      goalPourcentage.innerHTML = `
      
      `;

      // Toggle tâches
      const toggleBtn = document.createElement('button');
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
        inputId.value   = proj.id;
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

  // Création du container et form de tâches
  function createTasksContainer(parentLi, projectId) {
    const container = document.createElement('div');
    container.className     = 'tasks-container';
    container.style.display = 'none';
    container.style.margin  = '0.5em 0';

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
     
      const id       = Number(idField.value);
      const name     = nameField.value.trim();
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

      // Checkbox task done
      const doneChk = document.createElement('input');
      doneChk.type    = 'checkbox';
      doneChk.classList.add('task-done');
      doneChk.checked = task.done;
      doneChk.onchange = async () => {
        await updateTask({ ...task, done: doneChk.checked });
        showToast('Tâche mise à jour');
        await renderTasks(projectId, tasksUl);
      };

      // Nom + deadline
      const nameSpan = document.createElement('div');
      nameSpan.classList.add('header-card');    
      nameSpan.innerHTML = `<p>${task.id} - ${task.name}</p><span class="deadline">Deadline : ${task.deadline}</span>`;
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

  // Submit du form projet
  async function onFormSubmit(e) {
    e.preventDefault();
    const name = inputName.value.trim();
    const id   = Number(inputId.value);

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

  // Init form/db
  async function init() {
    try {
      db = await openDB();
      await renderProjects();
      form.addEventListener('submit', onFormSubmit);
    } catch (err) {
      console.error('Erreur DB :', err);
    }
  }

document.addEventListener('DOMContentLoaded', init);