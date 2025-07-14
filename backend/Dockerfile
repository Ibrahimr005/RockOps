# Use OpenJDK 23
FROM openjdk:23-jdk-slim

# Set working directory
WORKDIR /app

# Copy all files from backend directory (Railway context is already backend/)
COPY . .

# Make Maven wrapper executable (if it exists)
RUN if [ -f mvnw ]; then chmod +x mvnw; fi

# Build the application
RUN if [ -f mvnw ]; then ./mvnw clean package -DskipTests; else mvn clean package -DskipTests; fi

# Set environment
ENV SPRING_PROFILES_ACTIVE=prod

# Expose port
EXPOSE 8080

# Run the application
ENTRYPOINT ["java", "-jar", "target/backend-0.0.1-SNAPSHOT.jar"]
