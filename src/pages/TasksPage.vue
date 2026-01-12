<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-mb-lg justify-between">
      <h1 class="text-h4 q-my-none">📋 Task Management</h1>
      <div class="flex items-center gap-md">
        <span class="text-body2">Welcome, <strong>{{ user.username }}</strong>!</span>
        <q-btn
          flat
          color="negative"
          label="Logout"
          icon="logout"
          @click="logout"
          size="sm"
        />
      </div>
    </div>

    <!-- Add Task Form -->
    <q-card class="q-mb-lg">
      <q-card-section>
        <div class="text-h6 q-mb-md">Add New Task</div>
        <form @submit.prevent="addTask">
          <div class="row q-col-gutter-md">
            <div class="col-xs-12 col-sm-6">
              <q-input
                v-model="form.title"
                label="Task Title *"
                outlined
                dense
                :rules="[val => !!val || 'Title is required']"
                @keyup.enter="addTask"
              />
            </div>
            <div class="col-xs-12 col-sm-6">
              <q-select
                v-model="form.status"
                :options="statusOptions"
                label="Status"
                outlined
                dense
              />
            </div>
            <div class="col-xs-12">
              <q-input
                v-model="form.description"
                label="Description"
                outlined
                type="textarea"
                dense
                rows="3"
              />
            </div>
            <div class="col-xs-12">
              <q-btn
                type="submit"
                color="primary"
                label="Add Task"
                :loading="loading"
                class="full-width"
              />
            </div>
          </div>
        </form>
      </q-card-section>
    </q-card>

    <!-- Error Message -->
    <q-banner v-if="error" class="bg-red-2 text-red-9 q-mb-md rounded-borders">
      ⚠️ {{ error }}
    </q-banner>

    <!-- Success Message -->
    <q-banner v-if="success" class="bg-green-2 text-green-9 q-mb-md rounded-borders">
      ✅ {{ success }}
    </q-banner>

    <!-- Loading Spinner -->
    <div v-if="loadingTasks" class="flex justify-center q-my-lg">
      <q-spinner color="primary" size="50px" />
    </div>

    <!-- Tasks List -->
    <div v-else-if="tasks.length > 0" class="row q-col-gutter-md">
      <div
        v-for="task in tasks"
        :key="task.id"
        class="col-xs-12 col-sm-6 col-md-4"
      >
        <q-card class="full-height">
          <q-card-section>
            <div class="text-h6">{{ task.title }}</div>
            <q-badge
              :color="getStatusColor(task.status)"
              :label="task.status"
              class="q-mt-sm"
            />
            <p v-if="task.description" class="text-body2 q-mt-md q-mb-none">
              {{ task.description }}
            </p>
            <div class="text-caption text-grey q-mt-md">
              Created: {{ formatDate(task.created_at) }}
            </div>
          </q-card-section>
          <q-separator />
          <q-card-actions>
            <q-btn
              flat
              color="blue"
              icon="edit"
              size="sm"
              @click="editTask(task)"
              label="Edit"
            />
            <q-btn
              flat
              color="red"
              icon="delete"
              size="sm"
              @click="deleteTask(task.id)"
              label="Delete"
            />
          </q-card-actions>
        </q-card>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center q-my-lg">
      <q-icon name="inbox" size="80px" color="grey-5" />
      <p class="text-h6 text-grey-6">No tasks yet. Create one to get started!</p>
    </div>

    <!-- Edit Dialog -->
    <q-dialog v-model="editDialog">
      <q-card style="min-width: 400px">
        <q-card-section class="row items-center">
          <div class="text-h6">Edit Task</div>
          <q-space />
          <q-btn icon="close" flat round dense @click="editDialog = false" />
        </q-card-section>

        <q-separator />

        <q-card-section>
          <q-input
            v-model="editForm.title"
            label="Task Title"
            outlined
            dense
            class="q-mb-md"
          />
          <q-select
            v-model="editForm.status"
            :options="statusOptions"
            label="Status"
            outlined
            dense
            class="q-mb-md"
          />
          <q-input
            v-model="editForm.description"
            label="Description"
            outlined
            type="textarea"
            dense
            rows="3"
          />
        </q-card-section>

        <q-separator />

        <q-card-actions align="right">
          <q-btn
            flat
            label="Cancel"
            color="grey"
            @click="editDialog = false"
          />
          <q-btn
            unelevated
            label="Save"
            color="primary"
            @click="updateTask"
            :loading="loading"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const API_URL = 'http://localhost:5000/api';

// Check if user is logged in
const token = localStorage.getItem('authToken');
const user = ref(JSON.parse(localStorage.getItem('user') || '{}'));

if (!token) {
  router.push('/login');
}

const tasks = ref([]);
const loading = ref(false);
const loadingTasks = ref(true);
const error = ref('');
const success = ref('');

const form = ref({
  title: '',
  description: '',
  status: 'pending'
});

const editForm = ref({
  id: null,
  title: '',
  description: '',
  status: 'pending'
});

const editDialog = ref(false);

const statusOptions = ['pending', 'in_progress', 'completed'];

// Fetch all tasks
const fetchTasks = async () => {
  try {
    loadingTasks.value = true;
    const response = await fetch(`${API_URL}/tasks`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await response.json();

    if (data.success) {
      tasks.value = data.data;
    } else {
      showMessage(data.message || 'Failed to load tasks', 'error');
    }
  } catch (err) {
    error.value = 'Error connecting to server: ' + err.message;
  } finally {
    loadingTasks.value = false;
  }
};

// Add new task
const addTask = async () => {
  if (!form.value.title.trim()) {
    showMessage('Please enter a task title', 'error');
    return;
  }

  try {
    loading.value = true;

    const response = await fetch(`${API_URL}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(form.value)
    });

    const data = await response.json();

    if (data.success) {
      showMessage('Task added successfully!', 'success');
      form.value = { title: '', description: '', status: 'pending' };
      await fetchTasks();
    } else {
      showMessage(data.message, 'error');
    }
  } catch (err) {
    showMessage('Error adding task: ' + err.message, 'error');
  } finally {
    loading.value = false;
  }
};

// Edit task
const editTask = (task) => {
  editForm.value = { ...task };
  editDialog.value = true;
};

// Update task
const updateTask = async () => {
  try {
    loading.value = true;

    const response = await fetch(`${API_URL}/tasks/${editForm.value.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        title: editForm.value.title,
        description: editForm.value.description,
        status: editForm.value.status
      })
    });

    const data = await response.json();

    if (data.success) {
      showMessage('Task updated successfully!', 'success');
      editDialog.value = false;
      await fetchTasks();
    } else {
      showMessage(data.message, 'error');
    }
  } catch (err) {
    showMessage('Error updating task: ' + err.message, 'error');
  } finally {
    loading.value = false;
  }
};

// Delete task
const deleteTask = async (id) => {
  if (!confirm('Are you sure you want to delete this task?')) return;

  try {
    loading.value = true;

    const response = await fetch(`${API_URL}/tasks/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (data.success) {
      showMessage('Task deleted successfully!', 'success');
      await fetchTasks();
    } else {
      showMessage(data.message, 'error');
    }
  } catch (err) {
    showMessage('Error deleting task: ' + err.message, 'error');
  } finally {
    loading.value = false;
  }
};

// Format date
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
};

// Get status color
const getStatusColor = (status) => {
  const colors = {
    pending: 'orange',
    in_progress: 'blue',
    completed: 'green'
  };
  return colors[status] || 'grey';
};

// Logout
const logout = () => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
  router.push('/login');
};

// Auto-dismiss messages
const showMessage = (message, type = 'success') => {
  if (type === 'success') {
    success.value = message;
    setTimeout(() => {
      success.value = '';
    }, 3000);
  } else {
    error.value = message;
    setTimeout(() => {
      error.value = '';
    }, 4000);
  }
};

// Load tasks on mount
onMounted(() => {
  fetchTasks();
});
</script>

<style scoped>
.full-height {
  height: 100%;
}
</style>
