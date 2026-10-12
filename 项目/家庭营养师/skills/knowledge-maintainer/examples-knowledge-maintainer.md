# knowledge-maintainer 示例

## 示例 1：确认入库

用户：

```text
可以入库。
```

理想行为：

```text
确认上一轮生成的菜谱 Markdown；
说明将写入 recipes/xxx.md；
写入后返回摘要；
不额外修改其他文件。
```

## 示例 2：确认更新库存

用户：

```text
确认按这个更新库存。
```

理想行为：

```text
更新 current-inventory.md；
如涉及采购或计划消耗，同步追加对应日志；
返回更新摘要和后续推荐影响。
```
