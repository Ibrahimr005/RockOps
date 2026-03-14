package com.example.backend.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class CacheControlInterceptor implements HandlerInterceptor {

    // Reference data endpoints — cache for 5 minutes
    private static final String[] LONG_CACHE_PATHS = {
            "/api/v1/site",
            "/api/v1/itemCategories",
            "/api/v1/departments",
            "/api/equipment-types",
            "/api/v1/merchants",
            "/api/v1/measuring-units",
            "/api/v1/worktypes",
            "/api/v1/payment-types",
            "/api/v1/partner"
    };

    // Dashboard endpoints — cache for 1 minute
    private static final String[] SHORT_CACHE_PATHS = {
            "/api/dashboard"
    };

    @Override
    public void postHandle(HttpServletRequest request, HttpServletResponse response,
                           Object handler, org.springframework.web.servlet.ModelAndView modelAndView) {
        if (!"GET".equalsIgnoreCase(request.getMethod())) {
            return; // Only cache GET requests
        }

        String path = request.getRequestURI();

        for (String prefix : LONG_CACHE_PATHS) {
            if (path.startsWith(prefix)) {
                response.setHeader("Cache-Control", "private, max-age=300");
                return;
            }
        }

        for (String prefix : SHORT_CACHE_PATHS) {
            if (path.startsWith(prefix)) {
                response.setHeader("Cache-Control", "private, max-age=60");
                return;
            }
        }
        // All other endpoints: keep Spring Security's default no-cache
    }
}
