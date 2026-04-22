import type { Snapshot, User, UserRole, Vehicle, QueueCapacity } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://bhubezi-backend.onrender.com';

// Get auth token from localStorage
function getToken(): string | null {
  return localStorage.getItem('bhubezi-token');
}

function setToken(token: string) {
  localStorage.setItem('bhubezi-token', token);
}

function clearToken() {
  localStorage.removeItem('bhubezi-token');
}

// API request helper
async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}/api${endpoint}`;
  const token = getToken();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers as Record<string, string>
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  try {
    const response = await fetch(url, {
      ...options,
      headers
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }
    
    // Handle empty responses
    const contentLength = response.headers.get('content-length');
    if (contentLength === '0' || response.status === 204) {
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

// Form data request (for file uploads)
async function apiFormRequest(endpoint: string, formData: FormData) {
  const url = `${API_BASE_URL}/api${endpoint}`;
  const token = getToken();
  
  const headers: Record<string, string> = {};
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: formData
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }
  
  return await response.json();
}

export const BhubeziService = {
  // ========== AUTH ==========
  async login(phone: string, password: string): Promise<{ token: string; user: User }> {
    const response = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, password })
    });
    setToken(response.access_token);
    return { token: response.access_token, user: response.user };
  },

  async register(name: string, phone: string, password: string, role: UserRole, vehicle?: Vehicle): Promise<{ token: string; user: User }> {
    const response = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name,
        phone,
        password,
        role: role.toLowerCase(),
        vehicle_brand: vehicle?.brand,
        vehicle_color: vehicle?.color,
        vehicle_plate: vehicle?.plate
      })
    });
    setToken(response.access_token);
    return { token: response.access_token, user: response.user };
  },

  async getCurrentUser(): Promise<User | null> {
    try {
      return await apiRequest('/auth/me');
    } catch {
      clearToken();
      return null;
    }
  },

  logout() {
    clearToken();
  },

  // ========== PROFILE IMAGE ==========
  async uploadProfileImage(base64Image: string): Promise<any> {
    return await apiRequest('/auth/profile-image', {
      method: 'POST',
      body: JSON.stringify({ image: base64Image })
    });
  },

  // ========== SELFIE VERIFICATION ==========
  async uploadSelfie(selfieFile: File, documentFile?: File): Promise<any> {
    const formData = new FormData();
    formData.append('selfie', selfieFile);
    if (documentFile) {
      formData.append('document', documentFile);
    }
    return await apiFormRequest('/auth/verify-selfie', formData);
  },

  async approveDriver(userId: string): Promise<any> {
    return await apiRequest(`/auth/approve-verification/${userId}`, { method: 'POST' });
  },

  // ========== SNAPSHOT ==========
  async getSnapshot(): Promise<Snapshot> {
    return await apiRequest('/snapshot');
  },

  // ========== TAXI ROUTES & RANKS ==========
  async getTaxiRoutes(): Promise<any[]> {
    return await apiRequest('/taxi-routes');
  },

  async getTaxiRanks(): Promise<any[]> {
    return await apiRequest('/taxi-ranks');
  },

  async getRankStatus(): Promise<any[]> {
    return await apiRequest('/rank-status');
  },

  async updateRankStatus(rankId: string, capacity: QueueCapacity, loadEstimate: number, marshalName: string): Promise<any> {
    return await apiRequest('/rank-status', {
      method: 'POST',
      body: JSON.stringify({ rank_id: rankId, capacity: capacity.toLowerCase(), load_estimate: loadEstimate })
    });
  },

  // ========== PINGS (RIDE REQUESTS) ==========
  async createPing(passengerId: string, passengerName: string, originRankId: string, destinationRankId: string, price: number, message: string): Promise<any> {
    return await apiRequest('/pings', {
      method: 'POST',
      body: JSON.stringify({ origin_rank_id: originRankId, destination_rank_id: destinationRankId, price, message })
    });
  },

  async getActivePings(): Promise<any[]> {
    return await apiRequest('/pings/active');
  },

  async acceptPing(pingId: string, driverId: string, driverName: string): Promise<any> {
    return await apiRequest(`/pings/${pingId}/accept`, { method: 'POST' });
  },

  async confirmPickup(pingId: string): Promise<any> {
    return await apiRequest(`/pings/${pingId}/confirm`, { method: 'POST' });
  },

  // ========== DRIVER ==========
  async updateDriverStatus(userId: string, routeId: string, occupancy: number): Promise<any> {
    return await apiRequest('/driver/status', {
      method: 'POST',
      body: JSON.stringify({ route_id: routeId, occupancy })
    });
  },

  async getActiveDrivers(): Promise<any[]> {
    return await apiRequest('/drivers/active');
  },

  // ========== SOCIAL ==========
  async getPosts(): Promise<any[]> {
    return await apiRequest('/posts');
  },

  async createPost(authorId: string, authorName: string, content: string): Promise<any> {
    return await apiRequest('/posts', {
      method: 'POST',
      body: JSON.stringify({ content })
    });
  },

  async likePost(postId: string, userId: string): Promise<any> {
    return await apiRequest(`/posts/${postId}/like`, { method: 'POST' });
  },

  async replyToPost(postId: string, authorId: string, authorName: string, content: string): Promise<any> {
    // Note: Backend doesn't have reply endpoint yet, but we can add it
    return await apiRequest(`/posts/${postId}/reply`, {
      method: 'POST',
      body: JSON.stringify({ content })
    }).catch(() => ({ success: true })); // Fallback
  },

  // ========== SUGGESTIONS ==========
  async submitSuggestion(userId: string, userName: string, content: string, kind: 'IMPROVE' | 'REMOVE'): Promise<any> {
    // Note: Backend doesn't have suggestion endpoint yet
    return { success: true };
  },

  // ========== FAQ ==========
  async getFAQ(): Promise<any[]> {
    return await apiRequest('/faq');
  },

  async askQuestion(question: string, routeId?: string): Promise<any> {
    return await apiRequest('/faq', {
      method: 'POST',
      body: JSON.stringify({ question, route_id: routeId })
    });
  },

  async answerQuestion(faqId: string, answer: string, answeredBy: string): Promise<any> {
    return await apiRequest(`/faq/${faqId}/answer`, {
      method: 'POST',
      body: JSON.stringify({ answer })
    });
  },

  async verifyAnswer(faqId: string, verifierUserId: string): Promise<any> {
    // Note: Backend doesn't have verify endpoint yet
    return { success: true };
  },

  // ========== LEADERBOARD ==========
  async getLeaderboard(): Promise<any[]> {
    return await apiRequest('/leaderboard');
  },

  // Legacy API for backward compatibility
  async registerUser(name: string, role: UserRole, vehicle?: Vehicle): Promise<User> {
    const phone = `07${Math.floor(Math.random() * 100000000)}`;
    const password = 'temp123';
    const result = await this.register(name, phone, password, role, vehicle);
    return result.user;
  }
};

// Export for direct access
export { getToken, setToken, clearToken };
