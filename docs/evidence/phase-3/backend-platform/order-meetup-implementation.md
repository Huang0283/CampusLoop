# BP3-07 同版本双边确认

订单事件由服务端追加，客户端无覆盖事件 API。新/修改见面约定增加版本，清除双方约定确认和双方完成确认；旧版本确认返回冲突。双方对同版本约定确认后进入 MEETUP_ARRANGED，实际交易完成需双方各自确认。单方完成不变成 COMPLETED；双方完成时订单 COMPLETED、商品 SOLD、事件/通知同事务提交。重复确认不再增加事件。

取消仅限非最终状态且无人完成，恢复商品 ON_SALE，并撤销约定。约定/完成/评价的页面始终用服务端响应或重新查询事实，不在前端独立推进。

验证：test_two_account_durable_journey_and_permissions、test_meetup_revision_clears_confirmations_and_cancel_eligibility；浏览器完整流程见管理质量 two-account-e2e-report。日期使用课程演示数据，不代表真实见面执行。

