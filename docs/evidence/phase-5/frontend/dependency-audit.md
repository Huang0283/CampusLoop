# 前端依赖审计与修复记录

> 2026-10-25 PR #120 ????????????????????????? [M2 ??????](m2-pr120-acceptance.md)???????????????????????

更新日期：2026-10-23
工作分支：prep/m2-p5-main-alignment
修复提交：ad28a23

## 问题与修复

新版界面基线干净安装时，全量审计报告 7 项高危，
仅生产依赖审计报告 1 项高危。

先执行 npm audit fix，再为固定解析器版本配置局部 override。
未执行 npm audit fix --force，SDK 生成器保持 0.99.0。

| 依赖 | 修复前 | 修复后 |
| --- | --- | --- |
| follow-redirects | 1.16.0 | 1.16.1 |
| vite | 8.3.0 | 8.3.5 |
| postcss | 8.5.28 | 8.5.31 |
| source-map-js | 1.2.1 | 1.2.2 |
| js-yaml | 4.2.0 | 4.3.2 |

package.json 中的 override 仅作用于
@hey-api/json-schema-ref-parser@1.4.4 下的 js-yaml，
固定使用 4.3.2。package-lock.json 同步提交。

## 已执行验证

在新版独立检出目录完成：

- npm ci 成功，安装输出报告 0 项漏洞。
- npm audit：0 项漏洞。
- npm audit --omit=dev：0 项漏洞。
- npm ls 确认修复版本及局部 override 生效。
- npm run sdk:check 通过，生成内容经换行归一化比较无差异。
- npm run lint、TypeScript 检查及生产构建通过。
- 后续真实链路和浏览器检查见 browser-responsive-report.md、shell-defects.md。

审计结果反映本次执行时的依赖和漏洞数据库状态，不代表持续零风险。
后续修改依赖或发布候选时，应重新审计并保存结果。

## 维护与接收

由 M2 维护本次依赖变更；涉及生成器解析链的 override 需 M6 交叉确认。
上游解析器更新后，应重新评估并移除不再需要的 override，
同时执行 SDK 漂移检查。

正式任务分支迁移、团队评审及 M10 最终候选复验仍待完成。

## 2026-10-24 无障碍工具及检查依赖补充

为无障碍回归新增开发依赖 @axe-core/playwright，
直接版本固定为 4.14.0，其 axe-core 依赖为 4.14.0。

本轮审计另发现 ESLint 工具链中的 zod 漏洞：
eslint-plugin-react-hooks@7.1.1 及 zod-validation-error@4.0.2 使用该依赖。
执行普通 npm audit fix，仅更新一个包，
将 zod 从 4.6.5 更新为 4.6.7，未执行强制升级。
随后 npm audit 报告 0 项漏洞，lint 通过。

证据见 verification-output/accessibility-tool-versions.txt、
verification-output/dependency-audit-current.txt 和
verification-output/lint-current.txt。

此前 js-yaml 局部 override 继续保留。
审计结果反映本次执行状态，最终候选仍需复核。
