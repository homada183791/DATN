# Stage 1: Builder
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (bao gồm devDependencies để build)
RUN npm install

# Copy mã nguồn và cấu trúc DB
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build ứng dụng NestJS (kết quả nằm trong thư mục dist)
RUN npm run build

# Xóa devDependencies để giảm nhẹ dung lượng thư mục node_modules
RUN npm prune --production

# ==========================================

# Stage 2: Production
FROM node:20-alpine AS production

WORKDIR /app

# Copy package.json
COPY --from=builder /app/package*.json ./

# Chỉ copy những thành phần cần thiết cho production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Mở port 3000
EXPOSE 3000

# Khởi động ứng dụng
CMD ["npm", "run", "start:prod"]