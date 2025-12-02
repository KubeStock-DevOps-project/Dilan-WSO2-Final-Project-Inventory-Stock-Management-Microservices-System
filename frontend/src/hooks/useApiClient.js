import { useMemo } from "react";
import axios from "axios";
import { useAuthContext } from "@asgardeo/auth-react";
import { SERVICES } from "../utils/constants";

/**
 * Hook to create authenticated API clients using Asgardeo tokens
 * This replaces the old localStorage-based token handling
 */
export const useApiClient = () => {
  const { getAccessToken } = useAuthContext();

  const createClient = useMemo(() => {
    return (baseURL) => {
      const instance = axios.create({
        baseURL,
        headers: {
          "Content-Type": "application/json",
        },
      });

      // Request interceptor - inject token from Asgardeo
      instance.interceptors.request.use(
        async (config) => {
          try {
            const token = await getAccessToken();
            if (token) {
              config.headers.Authorization = `Bearer ${token}`;
            }
          } catch (error) {
            console.error("Error getting access token:", error);
          }
          return config;
        },
        (error) => Promise.reject(error)
      );

      // Response interceptor - handle auth errors
      instance.interceptors.response.use(
        (response) => response,
        (error) => {
          if (error.response?.status === 401) {
            if (!window.location.pathname.includes("/login")) {
              window.location.href = "/login";
            }
          }
          return Promise.reject(error);
        }
      );

      return instance;
    };
  }, [getAccessToken]);

  // Pre-configured clients for each service
  const clients = useMemo(() => ({
    product: createClient(SERVICES.PRODUCT),
    inventory: createClient(SERVICES.INVENTORY),
    supplier: createClient(SERVICES.SUPPLIER),
    order: createClient(SERVICES.ORDER),
  }), [createClient]);

  return clients;
};

export default useApiClient;
