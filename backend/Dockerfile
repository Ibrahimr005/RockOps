# Build stage
FROM public.ecr.aws/docker/library/maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

# Copy Maven files (they're in the backend folder, which is the context)
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

# Runtime stage
FROM public.ecr.aws/docker/library/eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar

ENV SPRING_PROFILES_ACTIVE=prod

EXPOSE 8080

ENTRYPOINT ["java", \
  "-Xmx230m", \
  "-Xms128m", \
  "-XX:MaxMetaspaceSize=90m", \
  "-XX:ReservedCodeCacheSize=32m", \
  "-XX:MaxDirectMemorySize=16m", \
  "-Xss256k", \
  "-XX:+UseSerialGC", \
  "-XX:CICompilerCount=2", \
  "-jar", "app.jar"]