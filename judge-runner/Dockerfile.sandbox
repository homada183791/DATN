FROM ubuntu:22.04

RUN apt-get update && apt-get install -y --no-install-recommends \
    g++ \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# user riêng, không phải root, để chạy code người dùng nộp
RUN useradd -m -u 1000 -s /bin/bash sandbox
USER sandbox
WORKDIR /home/sandbox

# Container này không có server.js, không có package.json của app —
# nó chỉ là "môi trường thực thi", được judge-runner service gọi
# qua Docker API (dockerode) để tạo container tạm cho từng submission,
# mount input/code vào rồi chạy, xong huỷ container.