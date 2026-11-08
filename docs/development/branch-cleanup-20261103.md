# 前五阶段 GitHub 分支清理记录（2026-11-03）

基准 main：`f6b2bd2aad4d5a6761a70056316ecb63daebb9c7`。用户明确授权清理前五阶段不需要的分支。

实际删除 75 条，保留 59 条。四个 team 分支、九个 work 岗位分支与 main 均保留。

仅删除提交是main祖先、无开放PR引用、无现存本地worktree使用的阶段分支。删除前重新核对远端SHA；一次原子push并对每条引用使用期望SHA的lease，任一变化则整批拒绝。删除后逐条核验远端，所有保留引用的SHA保持不变。

删除的是远端分支引用，提交历史仍在main。没有删除本地分支、工作目录或用户材料。含未合并历史/仍有工作目录的分支保留，不凭名称猜测可删。

## 已删除分支与原提交

| 分支 | 原SHA |
|---|---|
| `fix/m3-p4-acceptance` | `534ead10e96277761d1b3184c6c2ab4da23bccbf` |
| `fix/m4-p4-notification-sync` | `b709eefe099ce6a315d27cd43d80b476ef842f34` |
| `fix/m4-phase1-closeout` | `cf2d890e975d74b84f8d7da8cf29d7570c66e827` |
| `fix/m5-p4-h4-06` | `b4d2d800bb5be7955498905a907e3ec7427ccabe` |
| `fix/m6-p4-acceptance` | `d0cd64cc1b6df5b18e06a687edff4b859e99d7eb` |
| `fix/m7-m8-p4-acceptance` | `36e9022ce19205051ee5cd9c305b2eb7547b2eca` |
| `fix/m7-p4-delivery-integrity` | `a924f770803ad7ec409cfc6dff68918882dd7b58` |
| `fix/m8-p4-acceptance` | `e9cff4bf95615e7d17e82d2a112fc6192bb6584d` |
| `fix/m9-p1-self-issues` | `00455d8c6a938961130a18a9004b5e723c0249cf` |
| `fix/phase1-4-closure-audit` | `7f468a487fe6959c34117b6d78da1d7ed99bf3bf` |
| `fix/phase2-frontend-clean-base` | `e81f504ce326e8bee1407b1d36bcbb19b25415dc` |
| `fix/phase2-integration-clean-base` | `537d188694025152a9673eb9f51f56c9876ac4d8` |
| `fix/phase3-meetup-report` | `7c539f739f941188cb4a392fccaf731d943297e7` |
| `fix/remove-phase2-from-main` | `821346e198ac382b68eac6091e3a47c4eb6bf31d` |
| `phase1/backend-platform` | `608a3aefb5e529ba28ef145a6c4bef569fbe8a9c` |
| `phase1/frontend-experience` | `34a705571b48f0d11b598f181d9407d219b5c6ce` |
| `phase1/integration` | `41f380ac738ed13545f740b7b4462daaa6baf4f2` |
| `phase1/intelligence` | `7ae848413a454b0fe20ebb50ad2f882072689335` |
| `phase2/backend-foundation` | `2c176afb2a7589ae5bd03f317d07c6d9c54d24b8` |
| `phase2/frontend-prototype` | `013b8291a0b6ce7cfd8be6b9b12f32470c93dd48` |
| `phase2/integration` | `8853338bb3449f3511b6ca9536f39ba84b0f85d3` |
| `phase2/intelligence-contracts` | `15da18ed3cadc1c1df4efc756395c67fa186598d` |
| `phase2/management-quality` | `74da50a5537bceed1f94019e36ba79d9c36abf26` |
| `phase4/backend-integration` | `688530772f389aa46ed3cfe6626691b7ed5f8114` |
| `phase4/frontend-integration` | `3209c1663ed86356c66a5659ffac20c2b8b83a63` |
| `phase4/integration` | `919c6277b2815f05fc821110b7f44844c7d997dd` |
| `phase4/intelligence-models` | `9caaecdee08b1692ea61a00933fd939aa9e5b653` |
| `phase4/management-quality` | `b3b25b5d52347f7a1a990721099dfb3e33f88e03` |
| `phase5/backend-release` | `f49a5a81d4fac7fa18442ae2ae581efbb25b08d8` |
| `phase5/frontend-release` | `780ec05d80903724dcac195d0b2925773ce79c6f` |
| `phase5/integration` | `d5eed2ba9c92b2ea2d1848f1fa8ae69e895ece26` |
| `phase5/release-candidate` | `7d4c010489813081c70a678a670ee4bc92aaef3f` |
| `prep/m2-p5-main-alignment` | `43f36f531c81d85594f51ac8d98f81f2ebe47cfe` |
| `prep/m7-p3-search-matching-baseline` | `f25375ef5ab52b4f0fda856963ac89f76605967e` |
| `task/m1-p2-baseline` | `d67b6cb8a398301662622b06a83ec44cc9169d05` |
| `task/m1-p4-final-main-receipt` | `6ae5c7e7a7c18739a49052e772d4725634bd4f50` |
| `task/m1-p4-freeze` | `ae79224f418aafaaa9620a17a5dd8e64a9fef689` |
| `task/m2-p2-acceptance-fixes` | `416cece0d2ed2e74c67b955d0d3c7aff2e84b697` |
| `task/m2-p2-auth-profile-prototype` | `d2d26853f983a4e4463e186aac26c51c12fde2ee` |
| `task/m2-p2-contract-review` | `8449880a26d06780aea233b888d52c1fe24a409e` |
| `task/m2-p2-page-api-map` | `92915dbac305b7d2eb5d08282fb4cd6afdbbb3d7` |
| `task/m2-p2-page-state-closeout` | `2662cfde159f802557557c4914be15d8ba314281` |
| `task/m2-p4-admin-freeze` | `02a6c78818bec5db60808e329478d9c1fa4694c8` |
| `task/m2-p5-frontend-release` | `444f8beb7649684386ae20f6bbcdf6697df7300f` |
| `task/m2-phase1-closeout` | `6ef8655fcfc60ba176ee6429d56f6fe681981126` |
| `task/m3-p2-auth-guard-return` | `0e35851f4e765113b10da7d0130d4892d0e560fb` |
| `task/m3-p2-closeout` | `1cd0012260769d99bce43375fefa8a6666f22a66` |
| `task/m3-p2-market-prototype` | `c63ee936591b1efca5fd68dc0ed214a084bbe1c5` |
| `task/m3-p4-ai-results` | `ccc5df5367c0adf1474de72ef6a9e64e90d9823f` |
| `task/m3-p5-market-fixes` | `a552f41ddd2af96082a705d3038841aa262e1622` |
| `task/m4-p4-governance-regression` | `664946de0a34220af2d2553ec7e0307821290f1c` |
| `task/m4-p5-transaction-fixes` | `f6fc39a422b6b6778bc307f16927e32d97565056` |
| `task/m5-p1-auth-boundary` | `773f2fd0ccb542684f8eec7185ca836c1082b571` |
| `task/m5-p2-auth-contracts` | `d41dc7493ad33ab3bfe4997866d451ad8a75f6ed` |
| `task/m5-p4-governance-api` | `b7e0a225054f5573ef6b81181e0f62a5ab573787` |
| `task/m5-p5-security` | `0a605e55ce8d61222816204c7f9d0d9de2a775e5` |
| `task/m6-p4-ai-orchestration` | `808d1757aec961853f2441a0c4b0a9a4f56c7feb` |
| `task/m6-p5-business-hardening。` | `0128d30367ca044a9858605bf39518cf53a86248` |
| `task/m7-p1-search-feasibility` | `7e7677a4b3457b9ed0cebb171688e3367c9ded9f` |
| `task/m7-p2-search-dataset-contract` | `03a9aefeb0cf878c34fcc283befb54c32b1accd2` |
| `task/m7-p4-semantic-matching` | `a559fcd8754a0229b7febe13385d9eb1110d43a0` |
| `task/m8-p1-price-risk-feasibility` | `d8a0c3913f0033b67fdae30d7f575d0c2159bbd4` |
| `task/m8-p2-price-risk-contract` | `4337b636d44282066cb19e2ae14d5aa9803d4afd` |
| `task/m8-p3-price-trust-baseline` | `762787f14d8bcb009e85548808c4bb34c26eae87` |
| `task/m8-p4-closeout` | `8d9e5560ff1609cb6dcacdf6bdd95327261e4652` |
| `task/m8-p4-price-evaluation` | `34a1500f2b17001900bbb36eaa22bd2a5ee6b239` |
| `task/m9-p1-platform-plan` | `5242d1898fa4795b54f612b0af7a9cf8a825cebe` |
| `task/m9-p2-evidence-closeout` | `3422e72964b1571f88f09c47a3a0f84161e33e30` |
| `task/m9-p4-worker-runtime` | `a2e188a0677e880d4329c9e28deab7168d12200a` |
| `task/m9-p5-deployment-recovery` | `ee23f24a3da0277a9a5e444b0f0848ba198778fc` |
| `task/m10-p2-test-design` | `a21064c156f75c4dbc4e911601d405a42f64883d` |
| `task/m10-p4-integration-test` | `1cc5cbf7633017ea69560cc2f43e0e308658b1da` |
| `task/mq-p1-complete` | `c8af845c9f53d001d0d5d9f0fd51dcd2f65e5760` |
| `task/solo-p2-closeout` | `d16ea0652373abdf02ad4e56c626c845fc9d11ef` |
| `task/solo-p3-mvp` | `9fee5467c9706f89657045e2351016c87584d566` |

需要恢复某条时，可从表中SHA创建分支并推送；这些SHA都是main祖先，可从正常main克隆获取。

## 保留引用与理由

| 分支 | SHA | 保留原因 |
|---|---|---|
| `audit/phase5-candidate-20261025` | `50108a3a50ca18e0da3f4db709da3f8bea2ee24c` | 仍有实际存在的本地worktree使用，保留远端引用 |
| `backup/frontend-experience-before-rebuild` | `84d21ad3d12976b3049ffe29b5e1b7e5b4552d9f` | 本轮前五阶段分支清理范围外 |
| `docs/bp2-public-market-read-acceptance` | `69bd61f76d168b1e05058254744e0838c1919809` | 本轮前五阶段分支清理范围外 |
| `docs/campusloop-proposal-revised` | `cae2d86f3ec13ed1f184b11f029eae1e92d0dd75` | 本轮前五阶段分支清理范围外 |
| `docs/collaboration-execution-workflow` | `dbf2232eff23ee92673517c9a2e7806fbb0f6dc5` | 本轮前五阶段分支清理范围外 |
| `docs/collaboration-testing-datasets` | `236b9bb9b75e2cd93dd1e533f9ea2c322209dc3a` | 本轮前五阶段分支清理范围外 |
| `docs/concrete-role-deliverables` | `9377dc2cca89611c7424d1d9e5d58391887b01de` | 本轮前五阶段分支清理范围外 |
| `docs/eight-member-closeout-plan` | `c8b2afdb61e1bc9ce55de66dd766974a4d16e4cf` | 本轮前五阶段分支清理范围外 |
| `docs/nine-member-collaboration` | `dcc82444e71fb7767c140cec810e406c9db640a4` | 本轮前五阶段分支清理范围外 |
| `docs/proposal-one-week-phases` | `46e75640ad6bb4b291f37d6e703af31b2b7d6fd3` | 本轮前五阶段分支清理范围外 |
| `docs/submission-ready-proposal` | `5438743de8d7265c7356450656205ea12937ab20` | 本轮前五阶段分支清理范围外 |
| `feat/aurora-redesign` | `ec9aea8aeecd5561d9677e2dbbb3c2b641449912` | 本轮前五阶段分支清理范围外 |
| `feat/campus-showcase-materials-20261029` | `4b6d697ee0f8f67fc93d308c5e0de7417aedf169` | 本轮前五阶段分支清理范围外 |
| `fix/frontend-fixed-user-menu` | `639a06774e9c2198be3e9cf32d6cecb6cf3283f1` | 本轮前五阶段分支清理范围外 |
| `fix/m3-p5-acceptance` | `8c305b2813f51006aad41d357e2b10956c9827ee` | 仍有实际存在的本地worktree使用，保留远端引用 |
| `fix/m6-p5-acceptance` | `1c2f97db31b4daeb545c44f493b48c33cb23cb63` | 仍有实际存在的本地worktree使用，保留远端引用 |
| `fix/m7-m8-p5-acceptance` | `ce490f829b332d42ebb884eb6aea32ed6d6e9f5d` | 仍有实际存在的本地worktree使用，保留远端引用 |
| `fix/m8-closeout-evidence` | `0abc3c5cfc2608b447aeac050ed5aa82003df207` | 本轮前五阶段分支清理范围外 |
| `fix/m8-phase5-authorization-snapshot` | `e0db41f2dc8fd05c7bd1eb95bf75464725d2673f` | 仍有实际存在的本地worktree使用，保留远端引用 |
| `fix/m8-real-transaction-gates` | `513c1e9eb03de4f1a1d820051da08178fd4bb92b` | 本轮前五阶段分支清理范围外 |
| `fix/product-price-validation` | `cb600ca93528f8b3f8fbade4d3e2f01499f30cd7` | 本轮前五阶段分支清理范围外 |
| `main` | `f6b2bd2aad4d5a6761a70056316ecb63daebb9c7` | 稳定主干/当前九人协作分支 |
| `merge/phase5-main-20261028` | `5c5098c009fb270e471502a70d9a4663e1d2d609` | 仍有实际存在的本地worktree使用，保留远端引用 |
| `phase1/management-quality` | `3360fb82fa4a932f3351c3257f8ca6dc2ceb2a91` | 存在尚未进入main的历史，保留 |
| `phase5/audit-candidate-20261025` | `c54d694d8e3aec75d10492ec970cf8bc101f93d4` | 存在尚未进入main的历史，保留 |
| `phase5/intelligence-release` | `94bd978fcbb987044e22d2e6d45722abec7860ab` | 仍有实际存在的本地worktree使用，保留远端引用 |
| `prep/m7-evaluation-evidence` | `f43c78623ce7489a3da6423954c421a14775f141` | 本轮前五阶段分支清理范围外 |
| `prep/m7-p4-semantic-matching` | `e4dc076d7a589f41b3d8cd61c246dabe67e9c39d` | 存在尚未进入main的历史，保留 |
| `prep/m7-p5-joint-delivery` | `2f4985734fedf4c16a248c4504e67dd9ae54814e` | 存在尚未进入main的历史，保留 |
| `prep/m7-p5-search-reproducibility` | `89aca5bedcba70e21e5440db735aa4597710c754` | 存在尚未进入main的历史，保留 |
| `task/m1-p5-release` | `9ec4f0fb3cdb88c10d2db85cfd81144ddf7c96b1` | 仍有实际存在的本地worktree使用，保留远端引用 |
| `task/m1-project-scope` | `0f98686f207a4b5673580b03a4ee0932ea19e226` | 本轮前五阶段分支清理范围外 |
| `task/m1-revert-frontend-to-vite` | `ebb7606e88a6448db1e3896c1bcd6f17226ad236` | 本轮前五阶段分支清理范围外 |
| `task/m2-fix-audit-content` | `7cd37faa62b6dfaa3515529667a93b9222bde7b2` | 本轮前五阶段分支清理范围外 |
| `task/m2-navigation-structure` | `51b28a3584dbe50331df00f3b9f46801b1f6ae35` | 本轮前五阶段分支清理范围外 |
| `task/m2-rebuild-frontend` | `70de9b817095af697588cb145044b0397b86259b` | 本轮前五阶段分支清理范围外 |
| `task/m3-transaction-pages` | `0ba14d2a1c6ab67936434512bd196ec19b9b3dec` | 本轮前五阶段分支清理范围外 |
| `task/m4-merge-transaction-entry` | `d3c9032fcba100146fa26b7b6bf21540cb4ff38c` | 本轮前五阶段分支清理范围外 |
| `task/m4-report-chat-notification-v2` | `28dd70ba412638a06f6b49051fe926fa2957dfee` | 本轮前五阶段分支清理范围外 |
| `task/m4-restore-meetup-flow` | `293207bf790af9294e1dc19a9366e093f72985e0` | 本轮前五阶段分支清理范围外 |
| `task/m4-unify-icons-and-link-pages` | `d7c2e27099654f1100b5f07eb15487a6f3fa8817` | 本轮前五阶段分支清理范围外 |
| `task/m9-p2-runtime-foundation` | `3a7a1846eaa36332770d3ad4ac87440998ea01d3` | 存在尚未进入main的历史，保留 |
| `task/m10-p5-final-verification` | `9d3ebbdade7d1980e9c0d8c4e97a5744f8de76ef` | 仍有实际存在的本地worktree使用，保留远端引用 |
| `task/m10-quality-docs` | `7b56dc4d19b69311050c874746bba8f0257a2c72` | 本轮前五阶段分支清理范围外 |
| `task/main-integration-project-update` | `e161f684ce9be5b1ea6468df5ec1c55da70b1a2e` | 本轮前五阶段分支清理范围外 |
| `task/phase5-final-integration` | `e2a5ade7167b64bc19e944a7067610e6793e3a90` | 仍有实际存在的本地worktree使用，保留远端引用 |
| `team/presentation` | `f1ba433c350a3d6e0f35ad65111aab86817f9b24` | 稳定主干/当前九人协作分支 |
| `team/reporting` | `f1ba433c350a3d6e0f35ad65111aab86817f9b24` | 稳定主干/当前九人协作分支 |
| `team/testing` | `6c16b72745f515fb03dfd8414254c4aed9b4cf8d` | 稳定主干/当前九人协作分支 |
| `team/user-experience` | `f1ba433c350a3d6e0f35ad65111aab86817f9b24` | 稳定主干/当前九人协作分支 |
| `work/presentation/demo-video` | `f1ba433c350a3d6e0f35ad65111aab86817f9b24` | 稳定主干/当前九人协作分支 |
| `work/presentation/slides-evidence` | `f1ba433c350a3d6e0f35ad65111aab86817f9b24` | 稳定主干/当前九人协作分支 |
| `work/reporting/report-editor` | `f1ba433c350a3d6e0f35ad65111aab86817f9b24` | 稳定主干/当前九人协作分支 |
| `work/reporting/system-evidence` | `f1ba433c350a3d6e0f35ad65111aab86817f9b24` | 稳定主干/当前九人协作分支 |
| `work/testing/business-journeys` | `f1ba433c350a3d6e0f35ad65111aab86817f9b24` | 稳定主干/当前九人协作分支 |
| `work/testing/data-permissions` | `e9344785ba173e2cf42f9a056895fe0f0a2f0893` | 稳定主干/当前九人协作分支 |
| `work/testing/environment-recovery` | `f1ba433c350a3d6e0f35ad65111aab86817f9b24` | 稳定主干/当前九人协作分支 |
| `work/user-experience/admin-deployment` | `f1ba433c350a3d6e0f35ad65111aab86817f9b24` | 稳定主干/当前九人协作分支 |
| `work/user-experience/student-experience` | `f1ba433c350a3d6e0f35ad65111aab86817f9b24` | 稳定主干/当前九人协作分支 |
