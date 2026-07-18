FROM mcr.microsoft.com/devcontainers/php:1-8.3

# Remove the faulty yarn apt repository to avoid GPG signature errors
RUN rm -f /etc/apt/sources.list.d/yarn.list

# Install sqlite3 cli
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends sqlite3 libsqlite3-dev
