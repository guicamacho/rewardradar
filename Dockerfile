# Shared image for the RewardRadar Node services (availability-service,
# data-core worker). Each Fly app selects its process command via its own
# fly.*.toml; the default command runs the availability service.
#
# The repo has no build step (TS is run via tsx), so devDependencies are
# installed and the image runs source directly. Pinned to the project's
# Node 22 target.
FROM node:22-slim
WORKDIR /app

# Workspace manifests + sources. Build context is the repo root.
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages ./packages

# tsx lives in devDependencies and is needed to run the TS entry points.
RUN npm ci --include=dev && npm cache clean --force

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["npm", "run", "start", "-w", "@rewardradar/availability-service"]
