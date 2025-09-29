<template>
  <v-card class="mb-6" v-if="collaborativeMode">
    <v-card-title class="d-flex justify-space-between align-center">
      <div class="d-flex align-center">
        <v-icon class="mr-2" :color="getConnectionColor()">{{ getConnectionIcon() }}</v-icon>
        Collaborative Session
        <v-chip
          size="small"
          :color="getConnectionColor()"
          class="ml-2"
        >
          {{ activeUsersCount }} {{ activeUsersCount === 1 ? 'user' : 'users' }}
        </v-chip>
      </div>

      <div class="d-flex gap-2">
        <v-btn
          size="small"
          variant="outlined"
          @click="showSettings = true"
        >
          <v-icon start>mdi-cog</v-icon>
          Settings
        </v-btn>

        <v-btn
          size="small"
          :color="collaborationSettings.shareSearches ? 'success' : 'grey'"
          :variant="collaborationSettings.shareSearches ? 'flat' : 'outlined'"
          @click="toggleSharing"
        >
          <v-icon start>mdi-share</v-icon>
          {{ collaborationSettings.shareSearches ? 'Sharing ON' : 'Sharing OFF' }}
        </v-btn>
      </div>
    </v-card-title>

    <v-card-text>
      <v-tabs v-model="activeTab" bg-color="transparent">
        <v-tab value="users">
          <v-icon start>mdi-account-group</v-icon>
          Active Users
        </v-tab>
        <v-tab value="searches">
          <v-icon start>mdi-magnify</v-icon>
          Shared Searches
        </v-tab>
        <v-tab value="activity">
          <v-icon start>mdi-pulse</v-icon>
          Live Activity
        </v-tab>
      </v-tabs>

      <v-tabs-window v-model="activeTab" class="mt-4">
        <!-- Active Users Tab -->
        <v-tabs-window-item value="users">
          <!-- Current User -->
          <div v-if="currentUser" class="mb-4">
            <h4 class="text-subtitle-1 mb-2">You</h4>
            <v-card variant="outlined">
              <v-list density="compact">
                <v-list-item>
                  <template #prepend>
                    <v-avatar :color="currentUser.color" size="32">
                      <v-icon color="white">mdi-account</v-icon>
                    </v-avatar>
                  </template>

                  <v-list-item-title>{{ currentUser.name }}</v-list-item-title>
                  <v-list-item-subtitle>
                    <div class="d-flex align-center">
                      <v-icon size="small" color="success" class="mr-1">mdi-circle</v-icon>
                      Online
                      <span v-if="currentUser.isTyping" class="ml-2">
                        <v-icon size="small" class="mr-1">mdi-keyboard</v-icon>
                        Typing...
                      </span>
                    </div>
                  </v-list-item-subtitle>

                  <template #append>
                    <v-btn
                      icon="mdi-pencil"
                      variant="text"
                      size="small"
                      @click="editUserName"
                    />
                  </template>
                </v-list-item>
              </v-list>
            </v-card>
          </div>

          <!-- Connected Users -->
          <div v-if="connectedUsers.size > 0">
            <h4 class="text-subtitle-1 mb-2">Other Users ({{ connectedUsers.size }})</h4>
            <v-list>
              <v-list-item
                v-for="user in Array.from(connectedUsers.values())"
                :key="user.id"
                density="compact"
              >
                <template #prepend>
                  <v-avatar :color="user.color" size="32">
                    <v-icon color="white">mdi-account</v-icon>
                  </v-avatar>
                </template>

                <v-list-item-title>{{ user.name }}</v-list-item-title>
                <v-list-item-subtitle>
                  <div class="d-flex align-center">
                    <v-icon size="small" color="success" class="mr-1">mdi-circle</v-icon>
                    {{ formatRelativeTime(user.lastActivity) }}
                    <span v-if="user.isTyping" class="ml-2">
                      <v-icon size="small" class="mr-1">mdi-keyboard</v-icon>
                      Typing...
                    </span>
                  </div>
                  <div v-if="user.currentQuery" class="text-caption">
                    Searching: "{{ user.currentQuery }}"
                  </div>
                </v-list-item-subtitle>

                <template #append>
                  <v-menu location="bottom end">
                    <template #activator="{ props }">
                      <v-btn
                        icon="mdi-dots-vertical"
                        variant="text"
                        size="small"
                        v-bind="props"
                      />
                    </template>
                    <v-list>
                      <v-list-item @click="followUser(user)">
                        <v-list-item-title>
                          <v-icon start>mdi-eye</v-icon>
                          Follow Search
                        </v-list-item-title>
                      </v-list-item>
                      <v-list-item @click="shareTemplate(user)">
                        <v-list-item-title>
                          <v-icon start>mdi-share</v-icon>
                          Share Template
                        </v-list-item-title>
                      </v-list-item>
                    </v-list>
                  </v-menu>
                </template>
              </v-list-item>
            </v-list>
          </div>

          <div v-else class="text-center py-6">
            <v-icon size="48" color="grey-lighten-1">mdi-account-group-outline</v-icon>
            <p class="mt-2 text-medium-emphasis">No other users online</p>
          </div>

          <!-- Typing Indicators -->
          <div v-if="typingUsers.length > 0" class="mt-4">
            <v-card variant="tonal" color="info">
              <v-card-text class="py-2">
                <div class="d-flex align-center">
                  <v-icon class="mr-2" size="small">mdi-keyboard</v-icon>
                  <span class="text-body-2">
                    {{ typingUsers.map(u => u.name).join(', ') }}
                    {{ typingUsers.length === 1 ? 'is' : 'are' }} typing...
                  </span>
                </div>
              </v-card-text>
            </v-card>
          </div>
        </v-tabs-window-item>

        <!-- Shared Searches Tab -->
        <v-tabs-window-item value="searches">
          <div v-if="recentCollaborativeSearches.length === 0" class="text-center py-6">
            <v-icon size="48" color="grey-lighten-1">mdi-magnify</v-icon>
            <p class="mt-2 text-medium-emphasis">No shared searches yet</p>
          </div>

          <v-timeline v-else density="compact">
            <v-timeline-item
              v-for="search in recentCollaborativeSearches"
              :key="search.id"
              size="small"
              :dot-color="getUserColor(search.userId)"
            >
              <template #icon>
                <v-icon size="small">mdi-magnify</v-icon>
              </template>

              <v-card variant="outlined" class="mb-2">
                <v-card-text class="py-2">
                  <div class="d-flex justify-space-between align-start mb-2">
                    <div>
                      <div class="text-body-2 font-weight-medium">
                        {{ search.query }}
                      </div>
                      <div class="text-caption text-medium-emphasis">
                        by {{ search.userName }} • {{ formatRelativeTime(search.timestamp) }}
                      </div>
                    </div>
                    <v-btn
                      icon="mdi-play"
                      variant="text"
                      size="small"
                      @click="runSharedSearch(search)"
                      title="Run this search"
                    />
                  </div>

                  <div class="d-flex align-center gap-2 text-caption">
                    <v-chip size="x-small" variant="outlined">
                      {{ search.resultCount }} results
                    </v-chip>
                    <v-chip
                      v-for="collection in search.collections"
                      :key="collection"
                      size="x-small"
                      variant="outlined"
                    >
                      {{ collection }}
                    </v-chip>
                  </div>
                </v-card-text>
              </v-card>
            </v-timeline-item>
          </v-timeline>
        </v-tabs-window-item>

        <!-- Live Activity Tab -->
        <v-tabs-window-item value="activity">
          <div v-if="activityFeed.length === 0" class="text-center py-6">
            <v-icon size="48" color="grey-lighten-1">mdi-pulse</v-icon>
            <p class="mt-2 text-medium-emphasis">No activity yet</p>
          </div>

          <v-timeline v-else density="compact">
            <v-timeline-item
              v-for="activity in activityFeed.slice(0, 20)"
              :key="activity.id"
              size="small"
              :dot-color="getActivityColor(activity.type)"
            >
              <template #icon>
                <v-icon size="small">{{ getActivityIcon(activity.type) }}</v-icon>
              </template>

              <div class="d-flex justify-space-between align-center">
                <div>
                  <div class="text-body-2">
                    <strong>{{ activity.userName }}</strong>
                    {{ getActivityDescription(activity) }}
                  </div>
                  <div class="text-caption text-medium-emphasis">
                    {{ formatRelativeTime(activity.timestamp) }}
                  </div>
                </div>
              </div>
            </v-timeline-item>
          </v-timeline>
        </v-tabs-window-item>
      </v-tabs-window>
    </v-card-text>

    <!-- Settings Dialog -->
    <v-dialog v-model="showSettings" max-width="600px">
      <v-card>
        <v-card-title>
          <v-icon class="mr-2">mdi-cog</v-icon>
          Collaboration Settings
        </v-card-title>

        <v-card-text>
          <v-form @submit.prevent="saveSettingsAndClose">
            <v-text-field
              v-model="collaborationSettings.userName"
              label="Your Name"
              variant="outlined"
              prepend-inner-icon="mdi-account"
              required
            />

            <v-row>
              <v-col cols="12" sm="6">
                <div class="text-body-2 mb-2">Your Color</div>
                <div class="d-flex gap-2">
                  <v-btn
                    v-for="color in userColors"
                    :key="color"
                    :color="color"
                    size="small"
                    icon
                    :variant="collaborationSettings.userColor === color ? 'flat' : 'outlined'"
                    @click="collaborationSettings.userColor = color"
                  >
                    <v-icon v-if="collaborationSettings.userColor === color">mdi-check</v-icon>
                  </v-btn>
                </div>
              </v-col>
            </v-row>

            <v-divider class="my-4" />

            <v-switch
              v-model="collaborationSettings.shareSearches"
              label="Share my searches automatically"
              color="primary"
              hide-details
            />

            <v-switch
              v-model="collaborationSettings.showActivityFeed"
              label="Show live activity feed"
              color="primary"
              hide-details
            />

            <v-switch
              v-model="collaborationSettings.enableNotifications"
              label="Enable notifications"
              color="primary"
              hide-details
            />

            <v-switch
              v-model="collaborationSettings.autoJoinRooms"
              label="Auto-join collaboration rooms"
              color="primary"
              hide-details
            />
          </v-form>
        </v-card-text>

        <v-card-actions>
          <v-btn variant="text" @click="showSettings = false">
            Cancel
          </v-btn>
          <v-spacer />
          <v-btn color="primary" @click="saveSettingsAndClose">
            Save Settings
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCollaboration, type CollaborativeUser, type CollaborativeSearch, type ActivityItem } from '@/composables/useCollaboration'
import { useWebSocket } from '@/composables/useWebSocket'

interface Props {
  collaborativeMode: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  runSearch: [search: CollaborativeSearch]
}>()

const {
  currentUser,
  connectedUsers,
  recentCollaborativeSearches,
  activityFeed,
  collaborationSettings,
  typingUsers,
  activeUsersCount,
  saveSettings,
  updateUser,
  getActivityIcon,
  getActivityColor
} = useCollaboration()

const { connectionStatus } = useWebSocket()

// Local state
const activeTab = ref('users')
const showSettings = ref(false)

const userColors = [
  '#2196F3', '#4CAF50', '#FF9800', '#9C27B0',
  '#F44336', '#00BCD4', '#795548', '#607D8B'
]

// Connection status
const getConnectionColor = () => {
  switch (connectionStatus.value) {
    case 'connected': return 'success'
    case 'connecting': return 'warning'
    case 'disconnected': return 'error'
    default: return 'grey'
  }
}

const getConnectionIcon = () => {
  switch (connectionStatus.value) {
    case 'connected': return 'mdi-wifi'
    case 'connecting': return 'mdi-wifi-strength-2'
    case 'disconnected': return 'mdi-wifi-off'
    default: return 'mdi-wifi'
  }
}

// User actions
function editUserName() {
  const newName = prompt('Enter your name:', collaborationSettings.userName)
  if (newName && newName !== collaborationSettings.userName) {
    collaborationSettings.userName = newName
    if (currentUser.value) {
      updateUser({ name: newName })
    }
    saveSettings()
  }
}

function toggleSharing() {
  collaborationSettings.shareSearches = !collaborationSettings.shareSearches
  saveSettings()
}

function followUser(user: CollaborativeUser) {
  if (user.currentQuery) {
    // This would trigger a search with the user's current query
    console.log('Following user search:', user.currentQuery)
  }
}

function shareTemplate(user: CollaborativeUser) {
  // This would open a template sharing dialog
  console.log('Share template with user:', user.name)
}

// Search actions
function runSharedSearch(search: CollaborativeSearch) {
  emit('runSearch', search)
}

// Activity descriptions
function getActivityDescription(activity: ActivityItem): string {
  switch (activity.type) {
    case 'search':
      return `searched for "${activity.data.query}" (${activity.data.resultCount} results)`
    case 'join':
      return 'joined the session'
    case 'leave':
      return 'left the session'
    case 'template_share':
      return `shared template "${activity.data.templateName}"`
    case 'collection_update':
      return `updated collections: ${activity.data.collections.join(', ')}`
    default:
      return 'performed an action'
  }
}

// Utilities
function getUserColor(userId: string): string {
  const user = Array.from(connectedUsers.value.values()).find(u => u.id === userId)
  return user?.color || 'grey'
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return `${diffInSeconds}s ago`
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  return `${Math.floor(diffInSeconds / 86400)}d ago`
}

function saveSettingsAndClose() {
  saveSettings()
  if (currentUser.value) {
    updateUser({
      name: collaborationSettings.userName,
      color: collaborationSettings.userColor
    })
  }
  showSettings.value = false
}
</script>

<style scoped>
.v-timeline {
  padding-top: 0;
}

.v-card {
  transition: transform 0.2s ease-in-out;
}

.v-card:hover {
  transform: translateY(-1px);
}

.user-color-picker {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
</style>