import json
import argparse
from pathlib import Path

BASE_DIR = Path(__file__).parent

def count_json(filename):
    try:
        with open(BASE_DIR / filename, "r", encoding="utf-8") as f:
            data = json.load(f)
            return len(data)
    except Exception as e:
        print(f"读取 {filename} 失败: {e}")
        return 0

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--namespace", default="permission")
    args = parser.parse_args()

    print(f"=== 数据核对 | 命名空间: {args.namespace} ===")
    
    accounts = count_json("accounts.json")
    products = count_json("products.json")
    wanted = count_json("wanted.json")
    invalid = count_json("invalid-inputs.json")
    search = count_json("search-checks.json")
    price = count_json("price-checks.json")
    trust = count_json("trust-risk-checks.json")

    print(f"账号文件: {accounts} 条")
    print(f"商品文件: {products} 条")
    print(f"求购文件: {wanted} 条")
    print(f"非法输入文件: {invalid} 条")
    print(f"搜索查询: {search} 条")
    print(f"价格输入: {price} 条")
    print(f"信誉风险: {trust} 条")
    
    if accounts == 8 and products == 60 and wanted == 12 and invalid == 24:
        print("✅ 基础数量核对通过。")
    else:
        print("❌ 基础数量核对失败，请检查数据文件。")

if __name__ == "__main__":
    main()