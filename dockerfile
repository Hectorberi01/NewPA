FROM node:23-slim

WORKDIR /app

# Copier uniquement les fichiers nécessaires à l'exécution
COPY package*.json ./
RUN npm install 
#--omit=dev 
#--force

# Copier uniquement les fichiers compilés
COPY dist ./dist

# Exposer le port (à adapter si nécessaire)
EXPOSE 3000

# Lancer le code compilé
CMD ["node", "dist/server.js"]