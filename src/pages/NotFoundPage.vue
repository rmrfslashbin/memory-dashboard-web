<template>
  <v-card class="text-center">
    <v-card-title class="text-h3">
      <v-icon size="large" class="mr-2">mdi-alert-circle</v-icon>
      404
    </v-card-title>
    <v-card-subtitle class="text-h5 mb-4">
      Page Not Found
    </v-card-subtitle>
    <v-card-text>
      <p>The page you're looking for doesn't exist.</p>
      <v-btn
        color="primary"
        prepend-icon="mdi-home"
        @click="$router.push('/')"
      >
        Go Home
      </v-btn>
    </v-card-text>
  </v-card>
</template>