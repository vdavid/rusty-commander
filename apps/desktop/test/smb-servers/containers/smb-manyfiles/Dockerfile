# SMB server with 10k+ files in one share
# Useful for testing listing performance and virtual scrolling
FROM alpine:3.21

RUN apk add --no-cache samba samba-client

# Create 10,000 files: 5,000 numbered text files, 2,000 documents, 2,000 images, 1,000 PDFs, and some subdirectories
# Using different naming patterns and file types for realistic testing
RUN mkdir -p /share && \
    cd /share && \
    for i in $(seq 1 5000); do \
    echo "File $i content" > "file_$(printf '%05d' $i).txt"; \
    done && \
    for i in $(seq 1 2000); do \
    echo "Document $i" > "document_$(printf '%04d' $i).doc"; \
    done && \
    for i in $(seq 1 2000); do \
    echo "Image placeholder $i" > "image_$(printf '%04d' $i).jpg"; \
    done && \
    for i in $(seq 1 1000); do \
    echo "PDF $i" > "report_$(printf '%04d' $i).pdf"; \
    done && \
    mkdir -p subfolder_a subfolder_b subfolder_c && \
    touch subfolder_a/nested.txt subfolder_b/nested.txt subfolder_c/nested.txt

COPY smb.conf /etc/samba/smb.conf

EXPOSE 445

CMD ["smbd", "--foreground", "--no-process-group", "--debug-stdout"]
