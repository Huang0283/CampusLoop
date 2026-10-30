import json
import argparse
import os
import sys
import urllib.request
import urllib.error
import base64
from pathlib import Path

BASE_DIR = Path(__file__).parent
API_BASE = os.environ.get("API_BASE_URL", "http://127.0.0.1:8001")

def load_json(filename):
    with open(BASE_DIR / filename, "r", encoding="utf-8") as f:
        return json.load(f)

def post(endpoint, data, token=None):
    url = f"{API_BASE}{endpoint}"
    req = urllib.request.Request(url, method="POST")
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    
    try:
        with urllib.request.urlopen(req, data=json.dumps(data).encode("utf-8")) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        print(f"HTTP Error {e.code}: {e.read().decode('utf-8')}")
        return None

def get(endpoint, token=None):
    url = f"{API_BASE}{endpoint}"
    req = urllib.request.Request(url, method="GET")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        print(f"HTTP Error {e.code}: {e.read().decode('utf-8')}")
        return None

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--namespace", default="permission")
    args = parser.parse_args()

    print(f"=== 开始导入数据 | 命名空间: {args.namespace} | API: {API_BASE} ===")

    # 1. 登录获取管理员/测试账号 Token (这里需要你填入实际演示账号密码)
    # 假设系统有默认的测试账号，或者需要提前在环境准备
    print("请确保你在运行前已经配置好测试账号，或者 API 已经启动。")
    print("由于未提供管理员凭证，此脚本仅演示调用结构。")
    
    # 2. 创建账号 (示例逻辑)
    accounts = load_json("accounts.json")
    print(f"待创建账号数: {len(accounts)}")
    # 真实逻辑：for acc in accounts: post('/auth/register', {...})
    
    # 3. 创建商品 (示例逻辑)
    products = load_json("products.json")
    print(f"待创建商品数: {len(products)}")
    # 真实逻辑：for p in products: post('/products', {...})

    print("=== 数据导入骨架执行完毕 ===")
    print("注意: 真实导入逻辑需结合 M10 提供的测试环境和 Token 才能跑通。")

if __name__ == "__main__":
    main()