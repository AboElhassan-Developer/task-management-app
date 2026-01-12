<template>
  <div class="login-container">
    <q-card class="login-card">
      <q-card-section class="text-center">
        <div class="text-h4 q-mb-md">📋 Task Manager</div>
        <div class="text-h6 text-grey-7">Sign In</div>
      </q-card-section>

      <q-separator />

      <q-card-section>
        <!-- Error Message -->
        <q-banner v-if="error" class="bg-red-2 text-red-9 q-mb-md rounded-borders">
          ⚠️ {{ error }}
          <template #avatar>
            <q-icon name="close" @click="error = ''" class="cursor-pointer" />
          </template>
        </q-banner>

        <form @submit.prevent="login">
          <!-- Email Input -->
          <q-input
            v-model="form.email"
            label="Email Address *"
            type="email"
            outlined
            dense
            class="q-mb-md"
            :rules="[
              val => !!val || 'Email is required',
              val => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) || 'Invalid email format'
            ]"
          />

          <!-- Password Input -->
          <q-input
            v-model="form.password"
            label="Password *"
            :type="showPassword ? 'text' : 'password'"
            outlined
            dense
            class="q-mb-md"
            :rules="[val => !!val || 'Password is required']"
          >
            <template #append>
              <q-icon
                :name="showPassword ? 'visibility_off' : 'visibility'"
                class="cursor-pointer"
                @click="showPassword = !showPassword"
              />
            </template>
          </q-input>

          <!-- Submit Button -->
          <q-btn
            type="submit"
            color="primary"
            label="Sign In"
            class="full-width q-mb-md"
            :loading="loading"
            size="lg"
          />
        </form>

        <!-- Sign Up Link -->
        <div class="text-center">
          <span class="text-body2">Don't have an account? </span>
          <q-btn
            flat
            color="primary"
            label="Sign Up"
            @click="$router.push('/register')"
            class="text-weight-bold"
          />
        </div>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const API_URL = 'http://localhost:5000/api';

const form = ref({
  email: '',
  password: ''
});

const showPassword = ref(false);
const loading = ref(false);
const error = ref('');

const login = async () => {
  if (!form.value.email || !form.value.password) {
    error.value = 'Please fill in all fields';
    return;
  }

  try {
    loading.value = true;
    error.value = '';

    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form.value)
    });

    const data = await response.json();

    if (data.success) {
      // Save token to localStorage
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Redirect to tasks page
      router.push('/tasks');
    } else {
      error.value = data.message || 'Login failed';
    }
  } catch (err) {
    error.value = 'Error connecting to server: ' + err.message;
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-card {
  width: 100%;
  max-width: 400px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}
</style>
