import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import { createVuetify, type ThemeDefinition } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

// Custom theme for Memory Dashboard
const lightTheme: ThemeDefinition = {
  dark: false,
  colors: {
    primary: '#1976D2',
    secondary: '#424242',
    accent: '#4CAF50',
    error: '#FF5252',
    info: '#2196F3',
    success: '#4CAF50',
    warning: '#FFC107',
    background: '#FAFAFA',
    surface: '#FFFFFF',
    'surface-variant': '#F5F5F5',
    'on-surface-variant': '#424242',
  },
}

const darkTheme: ThemeDefinition = {
  dark: true,
  colors: {
    primary: '#2196F3',
    secondary: '#616161',
    accent: '#4CAF50',
    error: '#FF5252',
    info: '#2196F3',
    success: '#4CAF50',
    warning: '#FFC107',
    background: '#121212',
    surface: '#1E1E1E',
    'surface-variant': '#2D2D2D',
    'on-surface-variant': '#BDBDBD',
  },
}

export default createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'light',
    themes: {
      light: lightTheme,
      dark: darkTheme,
    },
  },
  defaults: {
    VBtn: {
      variant: 'flat',
      rounded: 'md',
      style: 'text-transform: none;',
    },
    VCard: {
      variant: 'elevated',
      rounded: 'lg',
    },
    VTextField: {
      variant: 'outlined',
      density: 'comfortable',
    },
    VSelect: {
      variant: 'outlined',
      density: 'comfortable',
    },
    VTextarea: {
      variant: 'outlined',
      density: 'comfortable',
    },
    VChip: {
      size: 'small',
      rounded: 'md',
    },
  },
  icons: {
    defaultSet: 'mdi',
  },
})