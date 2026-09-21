# WeKnora 工具权限配置

> 用途：给家庭营养师 Agent 配置最小必要工具权限。

## 1. 默认开启的只读工具

```text
search_knowledge
read_document
list_documents
wiki_search
wiki_read_page
wiki_flag_issue
```

用途：

```text
检索家庭知识库；
读取菜谱和规则；
查找 Wiki 页面；
标记需要人工处理的问题。
```

## 2. 确认后才使用的写入工具

```text
wiki_write_page
wiki_replace_text
```

使用条件：

```text
用户明确说“确认写入 / 可以入库 / 按这个更新 / 把这个改进去”；
目标页面明确；
修改范围明确；
写入内容已经展示给用户。
```

## 3. 第一版禁用工具

```text
wiki_delete_page
wiki_rename_page
shell_exec
```

原因：

```text
删除和重命名难恢复；
shell 执行权限过大；
家庭营养师 MVP 不需要这些能力。
```

## 4. Web Search 策略

允许场景：

```text
用户明确要求收集、分析或整理新菜谱；
需要核对外部菜谱来源；
需要补全用户提供的不完整菜谱做法。
```

禁止场景：

```text
日常推荐；
库存更新；
饭后反馈；
已有菜谱库足够回答的问题。
```

## 5. 敏感信息边界

```text
不要写入 SSH 密码；
不要写入 WeKnora 登录密码；
不要写入 LLM / Embedding API Key；
不要写入 Token、Cookie 或密钥。
```
