FROM eclipse-temurin:21-jdk AS build
WORKDIR /app
COPY . .
RUN chmod +x gradlew 2>/dev/null || true
RUN ./gradlew bootJar --no-daemon 2>/dev/null || \
    (apt-get update && apt-get install -y wget unzip && \
     wget -q https://services.gradle.org/distributions/gradle-8.7-bin.zip && \
     unzip -q gradle-8.7-bin.zip && \
     ./gradle-8.7/bin/gradle bootJar --no-daemon)

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/build/libs/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
