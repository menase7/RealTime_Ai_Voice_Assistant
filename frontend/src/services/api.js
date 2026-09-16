const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export async function checkBackendHealth() {
  const start = performance.now();
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`, {
      headers: {
        'Accept': 'application/json',
      },
    });
    const latency = Math.round(performance.now() - start);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    return {
      success: true,
      latency,
      data,
    };
  } catch (error) {
    const latency = Math.round(performance.now() - start);
    return {
      success: false,
      latency,
      error: error.message || 'Unable to connect to backend server',
    };
  }
}
