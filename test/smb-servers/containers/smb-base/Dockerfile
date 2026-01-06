# Base SMB server using Samba
# Configurable via build args for different authentication modes
FROM alpine:3.21

RUN apk add --no-cache samba samba-client

# Build arguments for customization
ARG GUEST_OK=no
ARG CREATE_USER=""
ARG READ_ONLY=no
ARG SERVER_SIGNING=auto
ARG SERVER_STRING="Samba Test Server"

# Create share directory with sample files
RUN mkdir -p /share && \
    echo "This is a test file" > /share/test.txt && \
    echo "Hello from SMB" > /share/hello.txt && \
    mkdir -p /share/subfolder && \
    echo "Nested content" > /share/subfolder/nested.txt

# Copy template and entrypoint
COPY smb.conf.template /etc/samba/smb.conf.template
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Store build args as env vars for entrypoint to use
ENV GUEST_OK=${GUEST_OK}
ENV CREATE_USER=${CREATE_USER}
ENV READ_ONLY=${READ_ONLY}
ENV SERVER_SIGNING=${SERVER_SIGNING}
ENV SERVER_STRING=${SERVER_STRING}

EXPOSE 445

CMD ["/entrypoint.sh"]
