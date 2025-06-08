<template>
  <main
    class="bg-zinc-900 min-h-screen flex items-center justify-center p-4"
    @mousemove="onMouseMove"
  >
    <div
      class="absolute inset-0 bg-radial-[at_var(--gradient-x)_var(--gradient-y)] from-orange-700/20 via-orange-900/20 to-transparent z-0"
      :style="{
        '--gradient-x': gradientX,
        '--gradient-y': gradientY
      }"
    />
    <div class="bg-zinc-800 p-8 rounded-lg shadow-2xl text-center lg:max-w-screen-lg xl:max-w-screen-xl w-full relative z-10">
      <img
        :src="BudgetEdLogo"
        alt="BudgetEd Logo"
        class="mx-auto mb-6 w-24 h-24 rounded-full shadow-lg"
      >
      <h1 class="text-5xl font-extrabold text-white mb-2 tracking-tight font-blinker">
        Budget<span class="text-orange-500">Ed</span>
      </h1>
      <p class="text-zinc-300 text-md mb-12 max-w-2xl mx-auto">
        Intelligently create, manage, and optimize school district budgets.
      </p>

      <Transition name="fade">
        <form
          v-show="showForm"
          ref="form"
          enctype="multipart/form-data"
          class="transition-opacity duration-200 ease-in-out"
          @submit.prevent="sendData"
        >
          <div class="mb-8 ">
            <label class="block text-white text-lg mb-1 text-center w-full font-semibold">1. Upload Budget Files (PDF only)</label>
            <p class="text-zinc-300 text-sm text-center mb-3">
              Files can be a maximum of 20 MB each. You can upload multiple files.
            </p>
            <input
              type="file"
              multiple
              name="budget_files"
              required
              accept=".pdf"
              class="w-full max-w-xl p-3 rounded-lg bg-zinc-700 text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer
                     file:mr-4 file:py-2 file:px-5 file:rounded-full file:border-0 file:text-sm file:font-semibold
                     file:bg-orange-600 file:text-white hover:file:bg-orange-700 file:transition-all file:duration-200"
            >
          </div>

          <div class="flex flex-col md:flex-row gap-6 mb-8">
            <div class="flex-1">
              <p class="text-white text-lg mb-3 text-left font-semibold">
                2. Budget Context and Directions
              </p>
              <textarea
                name="context"
                required
                placeholder="Provide some context about what you want BudgetEd to help you with. BudgetEd can assist your school district with editing existing budgets, creating a new budget for an upcoming year, or identifying strategic ways to optimize spending and save money."
                class="w-full p-4 rounded-lg bg-zinc-700 text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 min-h-40 md:min-h-72 resize-y text-base"
              />
            </div>
            <div class="flex-1">
              <p class="text-white text-lg mb-3 text-left font-semibold">
                3. Feedback and Constraints
              </p>
              <textarea
                name="feedback"
                required
                placeholder="Add feedback from students, parents, or teachers regarding the current budget, or explain any existing budget constraints (e.g., funding cuts, new initiatives). BudgetEd can incorporate this feedback to help your school district craft a more responsive and effective budget."
                class="w-full p-4 rounded-lg bg-zinc-700 text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 min-h-40 md:min-h-72 resize-y text-base"
              />
            </div>
          </div>

          <button
            type="submit"
            :disabled="showLoader"
            class="bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-8 rounded-full text-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
          >
            <span v-show="showLoader">
              <i class="fa-solid fa-spinner animate-spin mr-3" />
            </span>
            {{ showLoader ? 'Generating Recommendations...' : 'Generate Budgeting Recommendations' }}
          </button>
        </form>
      </Transition>

      <Transition name="fade">
        <div
          v-if="showResponse || errorMessage"
          class="transition-opacity duration-200 ease-in-out mt-8 text-left"
        >
          <div
            v-if="apiResponseContent"
            class="bg-zinc-700 p-8 rounded-lg text-white max-h-[70vh] overflow-y-auto custom-scrollbar shadow-inner"
          >
            <h2 class="text-3xl font-bold text-orange-4 00 mb-6">
              Budget Recommendations:
            </h2>
            <div
              class="prose prose-invert prose-zinc prose-p:text-zinc-200 prose-headings:text-orange-200 prose-li:text-zinc-200 prose-a:text-orange-300 prose-strong:text-orange-200 prose-em:text-zinc-300 prose-code:bg-zinc-600 prose-code:text-orange-300 max-w-none text-lg leading-relaxed"
              v-html="renderedMarkdown"
            />
          </div>

          <div
            v-if="errorMessage"
            class="bg-red-700 p-6 rounded-lg text-white mt-6 shadow-md"
          >
            <h2 class="text-2xl font-bold mb-3">
              Error Occurred:
            </h2>
            <p>{{ errorMessage }}</p>
          </div>

          <button
            class="bg-zinc-600 hover:bg-zinc-700 text-white font-semibold py-3 px-8 rounded-full mt-8 transition-all duration-200 transform hover:scale-105"
            @click="resetForm"
          >
            Start Over
          </button>
        </div>
      </Transition>
    </div>
  </main>
</template>

<script setup>
import { ref, computed } from 'vue'; 
import axios from 'axios';
import { marked } from 'marked'; 
import BudgetEdLogo from '@/assets/images/BudgetEdLogo.png';

const showLoader = ref(false);
const showForm = ref(true);
const showResponse = ref(false);
const apiResponseContent = ref('');
const errorMessage = ref('');

const gradientX = ref('50%');
const gradientY = ref('50%');

const form = ref(null);

const renderedMarkdown = computed(() => {
  return marked.parse(apiResponseContent.value);
});

const onMouseMove = (event) => {
  const { clientX, clientY } = event;
  gradientX.value = `${(clientX / window.innerWidth) * 100}%`;
  gradientY.value = `${(clientY / window.innerHeight) * 100}%`;
};

const sendData = async () => {
  errorMessage.value = '';
  apiResponseContent.value = '';

  try {
    showLoader.value = true;
   

    const data = new FormData(form.value);
    const response = await axios.post('https://us-central1-starry-minutia-459807-a2.cloudfunctions.net/generateBudget/', data, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    if (response.data && response.data.content) {
      apiResponseContent.value = response.data.content;
    } else {
      errorMessage.value = 'API did not return expected content.';
    }

  } catch (error) {
    console.error('Error sending data:', error);
    errorMessage.value = 'Failed to generate recommendations. Please try again.';
    if (axios.isAxiosError(error) && error.response && error.response.data && error.response.data.error) {
      errorMessage.value = `Error: ${error.response.data.error}`;
    } else if (error.message) {
        errorMessage.value = `Error: ${error.message}`;
    }
  } finally {
    showResponse.value = true;
    showLoader.value = false;
    showForm.value = false;
  }
};

const resetForm = () => {
  showForm.value = true;
  showResponse.value = false;
  apiResponseContent.value = '';
  errorMessage.value = '';
  if (form.value) {
    form.value.reset();
  }
};
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

</style>