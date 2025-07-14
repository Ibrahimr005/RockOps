FROM openjdk:23-jdk-slim

WORKDIR /app

COPY target/*.jar app.jar

ENV SPRING_PROFILES_ACTIVE=prod

EXPOSE 8080

ENTRYPOINT ["java", "-jar","app.jar"]