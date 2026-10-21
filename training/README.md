# 四川血战智能体训练

此目录提供完整自动对局、示范数据、Lightning 模仿学习、MaskablePPO 强化学习、断点续训和独立评测。首版规则搜索智能体作为教师；新策略不会自动替换网页推荐。

## 四人、三人、两人对局

- 始终保留四个座位和四份收支记录。有人胡牌后退出行动，轮转自动跳过该座位，继续三人、再继续两人摸打。
- 第三家胡牌才正常结束；剩余两家及以上且牌墙耗尽时，在最后弃牌及全部响应处理完成后流局结算。
- 自摸和成功杠的付款对象只包含仍参与的玩家；花猪仍向其余三家付款，包括已胡玩家。
- 学习席位胡牌后，环境仍运行剩余玩家到整局终局，再返回剩余奖励。每局奖励总和 × 512 等于该席位最终净得分。
- 抢杠先裁定再完成补杠和收费；支持一炮多响、胡优先、尾部补牌、连杠收入转移、过手胡和升番例外。
- `stageDecisions` 分别统计四人、三人、两人阶段的决策数。

## 环境与安装

从仓库根目录运行，需 Node.js 和 Python。当前已验证 Windows / Python 3.14.7，依赖见 `requirements.txt`，完整验证环境锁定在 `requirements-lock.txt`。`.venv`、数据和模型不提交 Git。

```powershell
powershell -ExecutionPolicy Bypass -File training/setup.ps1
training/.venv/Scripts/python.exe training/run.py doctor
```

本机已建立 `training/.venv`，安装了 CPU PyTorch。`doctor` 会报告 CUDA 是否可用。`--device auto` 在当前环境选择 CPU；GPU 训练需要另行安装适配设备的 CUDA 版 PyTorch，并重新验证。现在的 CPU 小规模测试不等于 GPU 已验证。

跨平台可用 `python -m venv training/.venv`、该环境的 Python 安装依赖，再运行 `training/run.py`。若 Node 不在 PATH，可设置环境变量 `MAHJONG_NODE` 为其可执行文件绝对路径。

## 训练顺序

所有输出目录必须是新目录，防止覆盖以前的实验。下例的 1,000 局和 100,000 步是初始试验预算，不是达到棋力目标的承诺。

```powershell
# 1. 生成教师示范。每局完整收集，按整局划分训练/验证/测试集。
training/.venv/Scripts/python.exe training/run.py generate --output training/data/demo-v1 --games 1000 --seed 10000 --samples 32

# 2. 模仿教师，保存验证损失最低的策略和 Lightning 检查点。
training/.venv/Scripts/python.exe training/run.py imitate --data training/data/demo-v1 --output training/runs/bc-v1 --epochs 10 --device cpu

# 3. 用模仿策略初始化 PPO，优化实际净得分。
training/.venv/Scripts/python.exe training/run.py ppo --warm-start training/runs/bc-v1/policy.zip --output training/runs/ppo-v1 --steps 100000 --device cpu
```

教师复用 `hybrid-analysis-1.1`。训练默认采用 32 个隐藏世界、搜索深度 0，以控制生成成本；这是明确记录的教师预算，与网页默认 256 样本、深度 2 不同。`--samples 0` 可用于快速管线调试；生成时 `--teacher efficiency` 或 `random` 也只适合对照实验，不能称为首版攻防教师。

换三张和定缺目前由固定算法处理：最多花色中的序号最小三张换出，换后选最少花色为缺；平局按万、条、筒。换牌方向在三个方向等概率采样。独立单局，不研究连庄；最后四张必胡沿用项目当前草案。以上均不是学习目标。

## 续训与冻结对手

PPO 的 `latest.json` 指向最近完整更新后的 `step-N.zip`。复制该文件名到下面的 `--resume`，`--steps` 表示再训练的步数。PPO 每批收集完整 rollout，实际步数可能略超过请求值。

```powershell
training/.venv/Scripts/python.exe training/run.py ppo --resume training/runs/ppo-v1/step-100096.zip --output training/runs/ppo-v2 --steps 100000 --device cpu
```

上面的 `100096` 仅为默认 rollout=256 时的示例；以实际 `latest.json` 为准。恢复权重、优化器、累计步数和随机状态；牌局重新开局，不承诺逐步复现被中断的环境。学习率固定。`--warm-start` 只导入策略权重，用于模仿模型或新实验；它不恢复 PPO 优化器。

Lightning 续训使用 `imitate --resume <last.ckpt>`，保持相同数据集，`--epochs` 为新的总 epoch 数，并写入新的输出目录。只加载本项目自行生成的检查点。

默认对手池是随机合法、牌效率和冻结首版教师。通过 `--opponents` 调整；通过 `--snapshots <policy.zip> ...` 加入已评测的历史模型，模型在该次训练期间保持冻结，不自动接纳未评测模型。

## 独立评测

```powershell
training/.venv/Scripts/python.exe training/run.py evaluate --model training/runs/ppo-v1/step-100096.zip --output training/runs/eval-v1 --seeds 1000 --seed-start 2000000 --samples 32
```

每个独立牌墙种子轮换四个学习席位，分别运行候选策略和首版教师，面对同一固定对手配置。检查训练/验证种子重叠，报告平均净得分、胡牌率、放炮局比例、放炮支付、胡牌收入和胡牌所需摸牌数。

收益差先按同一种子四席求均值，再按种子 bootstrap 95% 区间，避免把四席当作独立样本。至少 1,000 个独立种子且收益差区间下界大于零才标记此配置下的正向证据；还需要多训练种子及多对手验证。小样本冒烟评测只检验流程，不证明提升。

规则哈希、模拟器/教师源码哈希、动作和观测版本不一致时拒绝加载旧模型或数据。每个模型同时需要 `.zip` 与同名 `.meta.json`，不要单独移动其中一个。更改规则或编码后应重新生成数据和模型。

## 测试和文件

```powershell
node --test training/tests/*.test.mjs
training/.venv/Scripts/python.exe -m unittest discover -s training/tests -p 'test_*.py'
```

- `sim/engine.mjs`：四席权威状态、合法动作、响应和终局。
- `sim/ledger.mjs`：支付、杠钱归属、转移和退税。
- `sim/observation.mjs`：仅含自身手牌与公开信息的固定编码。
- `sim/policies.mjs`：首版教师适配、随机和牌效率对手。
- `sim/server.mjs`：常驻 Node JSON 行协议。
- `mahjong_training/env.py`：Gymnasium 单学习席位环境。
- `mahjong_training/data.py`、`train.py`、`evaluate.py`：数据、训练、评测。

框架接口参考：[MaskablePPO 官方文档](https://sb3-contrib.readthedocs.io/en/master/modules/ppo_mask.html)、[LightningModule 官方文档](https://lightning.ai/docs/pytorch/stable/common/lightning_module.html)。
