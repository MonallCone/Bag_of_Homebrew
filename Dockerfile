# ---- Stage 1: Build the React frontend ----
FROM node:20 AS frontend
WORKDIR /app/web

COPY Bag_Of_Homebrew_Web/Bag_Of_Homebrew_Web/package*.json ./
RUN npm install

COPY Bag_Of_Homebrew_Web/Bag_Of_Homebrew_Web/ ./
RUN npm run build
# Produces /app/web/dist

# ---- Stage 2: Build the .NET API ----
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS api-build
WORKDIR /app/api

COPY Bag_Of_Homebrew_API/*.csproj ./
RUN dotnet restore

COPY Bag_Of_Homebrew_API/ ./

# Copy the built frontend into wwwroot so the API serves it
COPY --from=frontend /app/web/dist ./wwwroot

RUN dotnet publish -c Release -o /app/published

# ---- Stage 3: Runtime ----
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=api-build /app/published ./

EXPOSE 8080

ENTRYPOINT ["dotnet", "Bag_Of_Homebrew_API.dll"]