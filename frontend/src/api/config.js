// Central API configuration — change this one place to update all API calls
const API_BASE_URL = process.env.REACT_APP_API_URL || `http://${window.location.hostname}:8002`;

export default API_BASE_URL;
