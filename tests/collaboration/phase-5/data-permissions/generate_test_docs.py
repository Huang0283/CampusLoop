import csv
from pathlib import Path

DOCS_DIR = Path(__file__).parent.parent.parent.parent.parent / "docs/collaboration/phase-5/testing/data-permissions"
DOCS_DIR.mkdir(parents=True, exist_ok=True)

cases = [
    # 1. 注册
    ("T1-C01", "合法注册", "未登录", "合法邮箱密码", "201 Created"),
    ("T1-C02", "重复邮箱", "账号已存在", "重复邮箱", "409 Conflict"),
    ("T1-C03", "非法邮箱", "未登录", "invalid-email", "400 Bad Request"),
    ("T1-C04", "空密码", "未登录", "空密码", "400 Bad Request"),
    ("T1-C05", "密码过短", "未登录", "123", "400 Bad Request"),
    ("T1-C06", "失败重试", "注册失败", "合法密码", "成功创建"),
    # 2. 会话
    ("T1-C07", "正确登录", "账号存在", "正确凭据", "200 OK"),
    ("T1-C08", "错误密码", "账号存在", "错误凭据", "401 Unauthorized"),
    ("T1-C09", "禁用账号", "账号被禁用", "正确凭据", "403 Forbidden"),
    ("T1-C10", "退出拒绝", "已退出", "旧 Token", "401 Unauthorized"),
    ("T1-C11", "刷新恢复", "Token 有效", "refreshToken", "新 Token"),
    ("T1-C12", "过期会话", "Token 过期", "请求受保护接口", "401 Unauthorized"),
    # 3. 角色与权限
    ("T1-C13", "本人资料修改持久化", "A 已登录", "修改昵称学院", "200 OK，刷新后新值"),
    ("T1-C14", "不可改字段拒绝", "A 已登录", "尝试改角色信誉分", "400 或忽略"),
    ("T1-C15", "公开资料无邮箱", "D 已登录", "访问 A 的公开资料", "返回昵称评分，无邮箱 Token"),
    ("T1-C16", "普通用户访问管理 API", "A 已登录", "/admin/users", "403 Forbidden"),
    ("T1-C17", "游客可公开浏览", "无 Token", "/market 等", "200 OK"),
    ("T1-C18", "游客收藏/发布需登录", "无 Token", "触发收藏发布", "跳转登录，回跳目标"),
    # 4. 对象归属
    ("T1-C19", "不能编辑他人商品", "D 登录，P001 属 A", "D 改 P001", "403 Forbidden"),
    ("T1-C20", "不能编辑他人求购", "D 登录，W01 属 B", "D 改 W01", "403 Forbidden"),
    ("T1-C21", "不能读他人私聊", "A/B 有会话，D 登录", "请求该会话", "403/404"),
    ("T1-C22", "不能读他人订单", "A/B 有订单，D 登录", "请求该订单", "403/404"),
    ("T1-C23", "不能读见面私密信息", "A/B 有约定，D 登录", "请求该约定", "403/404"),
    ("T1-C24", "不能买自己商品", "A 登录，P001 属 A", "A 报价 P001", "400 Bad Request"),
    # 5. 举报证据
    ("T1-C25", "举报人可查本人记录", "B 提交举报登录", "/reports/mine", "200 OK 含记录"),
    ("T1-C26", "无关用户不能读记录", "D 登录，B 有举报", "D 查询", "403/404"),
    ("T1-C27", "普通用户不能处理举报", "A 登录，有举报", "请求 resolve", "403 Forbidden"),
    ("T1-C28", "管理员合法查看有审计", "R 登录（管理员）", "查看举报附件", "200 OK 有审计"),
    ("T1-C29", "聊天证据须有关联", "R 登录，看正常聊天", "无授权查看聊天", "403 Forbidden"),
    ("T1-C30", "公开信誉不含内部风险", "任意登录", "访问 A 公开资料", "无风险事实/私密标签"),
    # 6. 切换与隔离
    ("T1-C31", "多标签切换不串号", "A 与 B 不同标签", "交替请求数据", "各自见自己数据"),
    ("T1-C32", "会话失效", "Token 有效", "刷新后旧 Token 请求", "401"),
    ("T1-C33", "未带凭据拒绝", "无 Token", "受保护接口", "401 Unauthorized"),
    ("T1-C34", "伪造令牌拒绝", "伪造 Token", "受保护接口", "401 Unauthorized"),
    ("T1-C35", "私有媒体无授权拒绝", "无有效凭证", "私有图片 URL", "403 Forbidden"),
    ("T1-C36", "命名空间隔离不删他人", "A、B 两空间有数据", "A 空间 reset", "A 清空 B 完整"),
]

def generate_md():
    md_path = DOCS_DIR / "test-cases.md"
    with open(md_path, "w", encoding="utf-8") as f:
        f.write("# T1 账号与权限测试用例（Phase 5）\n\n")
        current_section = ""
        for case_id, title, pre, inp, expected in cases:
            section = case_id[:6]
            if section != current_section:
                current_section = section
                f.write(f"## {section}\n\n")
            f.write(f"### {case_id} {title}\n")
            f.write(f"- **前置条件**：{pre}\n")
            f.write(f"- **输入**：{inp}\n")
            f.write(f"- **预期**：{expected}\n")
            f.write("- **实际结果**：待执行\n\n")
    print(f"已生成: {md_path}")

def generate_csv():
    csv_path = DOCS_DIR / "execution-log.csv"
    with open(csv_path, "w", encoding="utf-8", newline='') as f:
        writer = csv.writer(f)
        writer.writerow(["case_id", "title", "pre_condition", "input", "expected", "actual", "status", "executed_at", "evidence_path", "defect_id"])
        for case_id, title, pre, inp, expected in cases:
            writer.writerow([case_id, title, pre, inp, expected, "待执行", "未执行", "", "", ""])
    print(f"已生成: {csv_path}")

if __name__ == "__main__":
    print(f"目标目录: {DOCS_DIR.resolve()}")
    generate_md()
    generate_csv()