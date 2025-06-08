<template>
  <main class="bg-zinc-900 min-h-screen flex items-center justify-center p-4">
    <div class="bg-zinc-800 p-8 rounded-lg shadow-lg text-center max-w-screen-lg w-full">
      <h1 class="text-4xl font-bold text-white mb-2">
        Budget<span class="text-orange-600">Ed</span>
      </h1>
      <p class="text-zinc-200 mb-6">
        BudgetEd creates, manages, and edits your school district's budget using AI.
      </p>

      <form @submit.prevent="sendData" enctype="multipart/form-data" ref="form">
        <div class="mb-6">
          <label class="block text-zinc-200 mb-2">Upload Budget Files</label>
          <input
            type="file"
            multiple
            name="budget_files"
            accept=".pdf"
            class="w-full p-2 rounded bg-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
        </div>

        <div class="flex gap-3 mb-3 items-between">
          <div class="grow">
            <textarea
              type="text"
              name="context"
              placeholder="Provide some context about what you want BudgetEd to help you with. BudgetEd can help your school district with editing district budgets, creating a new budget for a new year, or finding ways to save money."
              class="w-full p-2 rounded bg-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-orange-500 min-h-64"
            />
          </div>
          <div class="grow">
            <textarea
              type="text"
              name="feedback"
              placeholder="Add feedback from students, parents, or teachers about the current budget, or explain current budget constrains. BudgetEd can use this feedback to help your school district create a better budget."
              class="w-full p-2 rounded bg-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-orange-500 min-h-64"
            />
          </div>
        </div>

        <button type="submit" class="bg-orange-600 hover:bg-orange-700 text-white font-semibold py-2 px-4 rounded">
          <i v-show="showLoader" class="fa-solid fa-spinner animate-spin"></i>
          Generate Budgeting Recommendations
        </button>
      </form>
    </div>
  </main>
</template>
<script setup>

import { ref } from 'vue';
import axios from 'axios';

const showLoader = ref(false);

/** @type {import("vue").Ref<HTMLFormElement>} */
const form = ref();

const sendData = async () => {
  try {
    showLoader.value = true;
    const data = new FormData(form.value);
    const response = await axios.post('http://localhost:3000/', data, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    console.log('Response from server:', response.data);
  } catch (error) {
    console.error('Error sending data:', error);
  } finally {
    showLoader.value = false;
  }
};

</script>
