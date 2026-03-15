package com.example.backend.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class CacheHeaderFilter extends OncePerRequestFilter {

    // Reference data endpoints - cache for 5 minutes
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

    // Dashboard endpoints - cache for 1 minute
    private static final String[] SHORT_CACHE_PATHS = {
            "/api/dashboard"
    };

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        if ("GET".equalsIgnoreCase(request.getMethod())) {
            String path = request.getRequestURI();
            String cacheHeader = resolveCacheHeader(path);
            response.setHeader("Cache-Control", cacheHeader);
        } else {
            response.setHeader("Cache-Control", "no-cache, no-store, max-age=0, must-revalidate");
        }

        filterChain.doFilter(request, response);
    }

    private String resolveCacheHeader(String path) {
        for (String prefix : LONG_CACHE_PATHS) {
            if (path.startsWith(prefix)) {
                return "private, max-age=300";
            }
        }

        for (String prefix : SHORT_CACHE_PATHS) {
            if (path.startsWith(prefix)) {
                return "private, max-age=60";
            }
        }

        return "no-cache, no-store, max-age=0, must-revalidate";
    }
}
