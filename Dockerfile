FROM launcher.gcr.io/google/nodejs
COPY gulpfile.js package.json tsconfig.json creds.json /app/
COPY src /app/src
COPY views /app/views
ENV NODE_ENV development
RUN npm install > /dev/null
ENV NODE_ENV production
# ENV GCLOUD_PROJECT carrot-cake-139920
RUN npm install -g gulp
CMD ["gulp"]
