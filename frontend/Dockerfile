# Build Stage
FROM node:18-alpine AS build

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

# Production Stage
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html

# Custom nginx config to handle client side routing if needed
# and proxy requests during production if docker networking is used
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
