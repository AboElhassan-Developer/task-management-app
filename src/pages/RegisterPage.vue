<template>
  <div class="register-container">
    <q-card class="register-card">
      <q-card-section class="text-center">
        <div class="text-h4 q-mb-md">📋 Task Manager</div>
        <div class="text-h6 text-grey-7">Create Account</div>
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

        <!-- Success Message -->
        <q-banner v-if="success" class="bg-green-2 text-green-9 q-mb-md rounded-borders">
          ✅ {{ success }}
          <template #avatar>
            <q-icon name="close" @click="success = ''" class="cursor-pointer" />
          </template>
        </q-banner>

        <form @submit.prevent="register">
          <!-- Username Input -->
          <q-input
            v-model="form.username"
            label="Username *"
            outlined
            dense
            class="q-mb-md"
            :rules="[
              val => !!val || 'Username is required',
              val => val.length >= 3 || 'Username must be at least 3 characters'
            ]"
          />

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
            :rules="[
              val => !!val || 'Password is required',
              val => val.length >= 6 || 'Password must be at least 6 characters'
            ]"
          >
            <template #append>
              <q-icon
                :name="showPassword ? 'visibility_off' : 'visibility'"
                class="cursor-pointer"
                @click="showPassword = !showPassword"
              />
            </template>
          </q-input>

          <!-- Confirm Password Input -->
          <q-input
            v-model="form.confirmPassword"
            label="Confirm Password *"
            :type="showPassword ? 'text' : 'password'"
            outlined
            dense
            class="q-mb-md"
            :rules="[
              val => !!val || 'Please confirm your password',
              val => val === form.password || 'Passwords do not match'
            ]"
          />

          <!-- Submit Button -->
          <q-btn
            type="submit"
            color="primary"
            label="Create Account"
            class="full-width q-mb-md"
            :loading="loading"
            size="lg"
          />
        </form>

        <!-- Sign In Link -->
        <div class="text-center">
          <span class="text-body2">Already have an account? </span>
          <q-btn
            flat
            color="primary"
            label="Sign In"
            @click="$router.push('/login')"
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
  username: '',
  email: '',
  password: '',
  confirmPassword: ''
});

const showPassword = ref(false);
const loading = ref(false);
const error = ref('');
const success = ref('');

const register = async () => {
  if (!form.value.username || !form.value.email || !form.value.password || !form.value.confirmPassword) {
    error.value = 'Please fill in all fields';
    return;
  }

  if (form.value.password !== form.value.confirmPassword) {
    error.value = 'Passwords do not match';
    return;
  }

  if (form.value.password.length < 6) {
    error.value = 'Password must be at least 6 characters';
    return;
  }

  try {
    loading.value = true;
    error.value = '';
    success.value = '';

    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form.value)
    });

    const data = await response.json();

    if (data.success) {
      success.value = 'Account created successfully! Redirecting to login...';
      form.value = { username: '', email: '', password: '', confirmPassword: '' };

      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } else {
      error.value = data.message || 'Registration failed';
    }
  } catch (err) {
    error.value = 'Error connecting to server: ' + err.message;
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.register-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.register-card {
  width: 100%;
  max-width: 400px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}
</style>
