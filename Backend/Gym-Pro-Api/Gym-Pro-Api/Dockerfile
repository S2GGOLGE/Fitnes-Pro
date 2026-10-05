FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ["Gym-Pro-Api.csproj", "./"]
RUN dotnet restore "Gym-Pro-Api.csproj"

COPY . .
RUN dotnet publish "Gym-Pro-Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app

COPY --from=build /app/publish .

EXPOSE 8080

ENTRYPOINT ["dotnet", "Gym-Pro-Api.dll"]
