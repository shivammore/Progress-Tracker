import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { bulkCreateDailyPlans } from './api/dailyPlanApi';

const SWE_ROADMAP = [
  {
    week: 1,
    focus: 'Foundations & Resume',
    summary: 'Kick off your journey by polishing your resume, clarifying your target company tier, and reviewing fundamental data structures.',
    days: [
      { day: 1, title: 'Set up Tracker & Target Companies', details: 'Establish tracking workspace. Collect 10-20 relevant job descriptions and list 10+ dream tier-1/tier-2 target companies.', tasks: '[ ] Set up tracking workspace; [ ] Gather 15 target job descriptions; [ ] Research and list 10 target companies with open roles' },
      { day: 2, title: 'Resume Draft & ATS Optimization', details: 'Optimize resume layout for automated screeners. Standardize margins, use high-impact action verbs, and integrate core keywords.', tasks: '[ ] Rewrite experience using STAR bullet points; [ ] Run ATS keywords audit for target roles; [ ] Build PDF resume draft' },
      { day: 3, title: 'GitHub & Portfolio Polish', details: 'Make a great first impression. Add high-quality READMEs, screenshots, and setup instructions to your top 3 repos.', tasks: '[ ] Add README with architecture diagram to top project; [ ] Clean up and pin top 3 GitHub repositories; [ ] Update LinkedIn headline and about section' },
      { day: 4, title: 'Python & SQL Review', details: 'Revisit programming fundamentals and database basics. Practice basic selections, filters, and aggregations.', tasks: '[ ] Review Python OOP and standard types; [ ] Solve 5 easy SQL problems (SELECT, WHERE, GROUP BY); [ ] Practice 3 easy LeetCode string exercises' },
      { day: 5, title: 'Data Structures - Arrays & Strings', details: 'Master array/string manipulation techniques. Learn sliding window and two-pointer basics.', tasks: '[ ] Study two-pointer array pattern; [ ] Solve LeetCode: Two Sum, Valid Palindrome; [ ] Solve LeetCode: Best Time to Buy and Sell Stock' },
      { day: 6, title: 'System Design Fundamentals', details: 'Study basic scalability concepts. Understand throughput, latency, vertical vs. horizontal scaling, and CAP theorem.', tasks: '[ ] Study latency numbers every programmer should know; [ ] Read system design fundamentals guide; [ ] Design a simple URL shortener' },
      { day: 7, title: 'Week 1 Review & Rest', details: 'Assess your performance, log any gaps in your study logs, and take a well-deserved rest.', tasks: '[ ] Log Python/SQL confidence levels; [ ] Review Week 1 LeetCode mistakes; [ ] Plan next week’s focus' }
    ]
  },
  {
    week: 2,
    focus: 'Core Coding & Projects',
    summary: 'Dive deeper into core algorithm patterns (Sliding Window, Two Pointers) and start documenting project architecture.',
    days: [
      { day: 8, title: 'LeetCode Medium - Two Pointers', details: 'Solve medium difficulty challenges to build strong analytical skills.', tasks: '[ ] Solve LeetCode: 3Sum; [ ] Solve LeetCode: Container With Most Water; [ ] Write down code patterns for two pointers' },
      { day: 9, title: 'Advanced SQL - Window Functions', details: 'Deep dive into analytical queries. Practice window functions, row ranking, and framing clauses.', tasks: '[ ] Study ROW_NUMBER, RANK, and DENSE_RANK differences; [ ] Practice 5 window function queries; [ ] Solve 2 hard SQL join problems' },
      { day: 10, title: 'Data Structures - Hash Maps & Sets', details: 'Understand key-value lookups, hash collisions, and when to use maps vs. sets for dynamic queries.', tasks: '[ ] Solve LeetCode: Group Anagrams; [ ] Solve LeetCode: Longest Consecutive Sequence; [ ] Implement basic hash table in Python' },
      { day: 11, title: 'Project Deep Dive - STAR Story', details: 'Structure your flagship project using the STAR (Situation, Task, Action, Result) method to prepare for interviews.', tasks: '[ ] Write 2-page STAR document for flagship project; [ ] Document scalability bottlenecks of your project; [ ] Optimize 1 bottleneck in codebase' },
      { day: 12, title: 'Timed Coding Mock Interview', details: 'Simulate a live interview environment. Solve a medium coding problem in 45 minutes while speaking out loud.', tasks: '[ ] Solve LeetCode medium with 40-min timer; [ ] Record yourself explaining solution out loud; [ ] Self-evaluate based on communication and edge cases' },
      { day: 13, title: 'System Design - Caching & CDNs', details: 'Learn caching strategies (Write-through, Write-back, Cache-aside) and CDN content delivery.', tasks: '[ ] Study Redis and Memcached architectures; [ ] Design system design layout for a Content Delivery Network; [ ] Map out cache eviction policies (LRU, LFU)' },
      { day: 14, title: 'Week 2 Review & Apply', details: 'Keep the momentum going. Submit applications to active openings and adjust study logs.', tasks: '[ ] Apply to 3 target company roles; [ ] Review Hash Map/Two Pointer LeetCode solutions; [ ] Refresh study logs' }
    ]
  },
  {
    week: 3,
    focus: 'Linear & Hierarchical Structures',
    summary: 'Focus on Linked Lists, Stacks, Queues, and the beginnings of tree traversals.',
    days: [
      { day: 15, title: 'Linked Lists Manipulation', details: 'Master node pointers, reversal techniques, and list traversal strategies.', tasks: '[ ] Solve LeetCode: Reverse Linked List; [ ] Solve LeetCode: Linked List Cycle; [ ] Solve LeetCode: Merge Two Sorted Lists' },
      { day: 16, title: 'Stacks & Queues Patterns', details: 'Implement stacks and queues. Learn to apply them to parsing, buffering, and scheduling problems.', tasks: '[ ] Solve LeetCode: Valid Parentheses; [ ] Solve LeetCode: Min Stack; [ ] Implement a Queue using Stacks' },
      { day: 17, title: 'Tree Foundations & DFS', details: 'Learn binary trees, binary search trees (BST), and depth-first search traversals.', tasks: '[ ] Study Inorder, Preorder, Postorder traversals; [ ] Solve LeetCode: Maximum Depth of Binary Tree; [ ] Solve LeetCode: Invert Binary Tree' },
      { day: 18, title: 'Tree BFS Traversals', details: 'Master Breadth-First Search (level-order) traversal of tree structures.', tasks: '[ ] Study Queue-based BFS pattern; [ ] Solve LeetCode: Binary Tree Level Order Traversal; [ ] Solve LeetCode: Same Tree' },
      { day: 19, title: 'System Design - Relational vs NoSQL', details: 'Understand database storage systems, replication, indexing, and transactional guarantees.', tasks: '[ ] Review SQL ACID vs NoSQL BASE; [ ] Study Sharding and Replication types; [ ] Design storage layer for a chat application' },
      { day: 20, title: 'Behavioral Prep - Leadership', details: 'Draft behavioral stories around leadership, conflict resolution, and technical growth.', tasks: '[ ] Outline 3 leadership stories; [ ] Apply STAR framework to conflict scenarios; [ ] Refine behavioral pitches' },
      { day: 21, title: 'Week 3 Review & Apply', details: 'Review hierarchical structures and apply to fresh job applications.', tasks: '[ ] Apply to 3 job applications; [ ] Review BST search patterns; [ ] Relax and recharge' }
    ]
  },
  {
    week: 4,
    focus: 'Graphs & Recursion',
    summary: 'Tackle advanced graph algorithms, recursion, and relational schema database design.',
    days: [
      { day: 22, title: 'Recursion & Backtracking Basics', details: 'Understand stack execution frames, recursion limits, and basic search trees.', tasks: '[ ] Study recursion memory footprints; [ ] Solve LeetCode: Subsets; [ ] Solve LeetCode: Permutations' },
      { day: 23, title: 'Graph BFS & DFS Fundamentals', details: 'Learn adjacency lists, adjacency matrices, and fundamental graph search algorithms.', tasks: '[ ] Implement adjacency list in Python; [ ] Solve LeetCode: Clone Graph; [ ] Solve LeetCode: Course Schedule' },
      { day: 24, title: 'Advanced Graph Traversals', details: 'Master matrix traversals and component matching algorithms.', tasks: '[ ] Solve LeetCode: Number of Islands; [ ] Solve LeetCode: Max Area of Island; [ ] Study Dijkstra’s algorithm concept' },
      { day: 25, title: 'Database Design & SQL Performance', details: 'Practice designing schema layouts, primary keys, foreign keys, and indexes.', tasks: '[ ] Design a database for an e-commerce platform; [ ] Analyze SQL query plans using EXPLAIN; [ ] Add indexes to optimize slow queries' },
      { day: 26, title: 'System Design - Load Balancers & Proxies', details: 'Study Layer 4 vs Layer 7 load balancers, reverse proxies, and API gateways.', tasks: '[ ] Study Round Robin vs Least Connections algorithm; [ ] Map load balancing setup in system diagram; [ ] Research Nginx vs HAProxy' },
      { day: 27, title: 'Mock Interview - System Design', details: 'Perform mock system design interview. Focus on scoping, high-level design, and bottlenecks.', tasks: '[ ] Design YouTube video streaming service; [ ] Identify single point of failures (SPOF); [ ] Discuss trade-offs in front of whiteboard' },
      { day: 28, title: 'Week 4 Review & Mid-Point Check', details: 'Review all algorithms and check tracker metrics.', tasks: '[ ] Review graph adjacency models; [ ] Apply to 4 new job listings; [ ] Update target company checklist' }
    ]
  },
  {
    week: 5,
    focus: 'Dynamic Programming & Advanced Algorithms',
    summary: 'Tackle optimization problems using memoization and tabular DP. Polish concurrent execution knowledge.',
    days: [
      { day: 29, title: 'DP - 1D Memoization', details: 'Understand overlapping subproblems. Master top-down memoization techniques.', tasks: '[ ] Study memoization concept; [ ] Solve LeetCode: Climbing Stairs; [ ] Solve LeetCode: Coin Change' },
      { day: 30, title: 'DP - Tabulation', details: 'Convert recursion into bottom-up array tabulation for optimal memory utilization.', tasks: '[ ] Solve LeetCode: Longest Common Subsequence; [ ] Solve LeetCode: House Robber; [ ] Write trade-offs between Top-Down and Bottom-Up' },
      { day: 31, title: 'Advanced Array - Sliding Window Medium', details: 'Apply variable-size sliding window algorithms to optimize sub-array lookups.', tasks: '[ ] Solve LeetCode: Longest Substring Without Repeating Characters; [ ] Solve LeetCode: Minimum Size Subarray Sum; [ ] Document sliding window template' },
      { day: 32, title: 'Concurrency & Multithreading Basics', details: 'Learn process vs thread, thread pools, locks, mutexes, and deadlocks.', tasks: '[ ] Write multithreaded script in Python; [ ] Study Python GIL (Global Interpreter Lock); [ ] Practice mutex lock patterns' },
      { day: 33, title: 'OOD - Design Patterns', details: 'Review SOLID principles and common design patterns (Singleton, Factory, Strategy).', tasks: '[ ] Apply SOLID principles to a code mockup; [ ] Implement Factory pattern; [ ] Implement Observer pattern' },
      { day: 34, title: 'System Design - Distributed Messaging', details: 'Deep dive into event-driven design, queues, and pub/sub message brokers.', tasks: '[ ] Study Kafka, RabbitMQ, and SQS differences; [ ] Design system architecture for a notification service; [ ] Map out partitioning and ordering guarantees' },
      { day: 35, title: 'Week 5 Review & Rest', details: 'Consolidate DP algorithms, review multithread safety, and take rest.', tasks: '[ ] Log DP confidence in study logs; [ ] Review SOLID principles cheat sheet; [ ] Rest' }
    ]
  },
  {
    week: 6,
    focus: 'Advanced System Design & Heap',
    summary: 'Master priority queues (heaps), advanced analytics system design, and security protocols.',
    days: [
      { day: 36, title: 'Heaps / Priority Queues', details: 'Understand min-heaps, max-heaps, and scheduling algorithms using heaps.', tasks: '[ ] Implement min-heap; [ ] Solve LeetCode: Kth Largest Element in an Array; [ ] Solve LeetCode: Top K Frequent Elements' },
      { day: 37, title: 'System Design - Real-time Analytics', details: 'Design high-volume ingestion pipelines. Learn about Spark, Flink, and Lambda/Kappa architectures.', tasks: '[ ] Study Lambda vs Kappa architecture; [ ] Design a real-time tracking dashboard; [ ] Calculate storage requirements for 10M DAU' },
      { day: 38, title: 'API Design & Protocols', details: 'Learn REST, GraphQL, gRPC, and WebSockets. Study when to use which protocol.', tasks: '[ ] Map GraphQL vs REST trade-offs; [ ] Design a complete API spec for a ride-sharing service; [ ] Research WebSocket handshakes' },
      { day: 39, title: 'System Design - Security & Auth', details: 'Learn OAuth2, JWT, rate limiting, and standard encryption methods.', tasks: '[ ] Map out token-based auth flow; [ ] Design a robust rate limiter system; [ ] Read about symmetric vs asymmetric encryption' },
      { day: 40, title: 'Mock Interview - Live Coding', details: 'Run a mock coding interview on a previously unseen medium problem.', tasks: '[ ] Solve LeetCode medium under 35 mins; [ ] Explain dry run with mock variables; [ ] Self-evaluate algorithmic complexity' },
      { day: 41, title: 'Behavioral Prep - Conflict Resolution', details: 'Polish stories explaining how you navigated peer conflict or shifting requirements.', tasks: '[ ] Document 2 conflict stories; [ ] Draft feedback models (Situation-Behavior-Impact); [ ] Practice out loud' },
      { day: 42, title: 'Week 6 Review & Apply', details: 'Expand applications to tier-2 companies and review heap operations.', tasks: '[ ] Apply to 5 active openings; [ ] Review priority queue patterns; [ ] Log learning gaps' }
    ]
  },
  {
    week: 7,
    focus: 'Scale, Speed, & Behavioral Polish',
    summary: 'Ramp up system scaling, high-concurrency challenges, and final STAR polishing.',
    days: [
      { day: 43, title: 'LeetCode - Mixed Medium Review', details: 'Perform mixed LeetCode sets across multiple random categories.', tasks: '[ ] Solve 1 array, 1 tree, and 1 graph medium; [ ] Avoid hints during dry run; [ ] Log optimization notes' },
      { day: 44, title: 'System Design - Distributed Transactions', details: 'Master distributed consistency (Saga pattern, Two-Phase Commit).', tasks: '[ ] Study 2PC vs 3PC; [ ] Design transactions for a payment gateway; [ ] Study eventual consistency patterns' },
      { day: 45, title: 'Mock Panel Interview', details: 'Perform a comprehensive panel interview simulation containing coding, system design, and behavioral questions.', tasks: '[ ] Conduct mock panel session with friend or AI; [ ] Review presentation style; [ ] Score technical and architectural components' },
      { day: 46, title: 'Flagship Project Pitch Practice', details: 'Practice presenting your project and pitching it confidently in under 3 minutes.', tasks: '[ ] Write 3-min project elevator pitch; [ ] Record yourself presenting project; [ ] Trim corporate jargon and focus on value' },
      { day: 47, title: 'SQL & Database Optimization Deep Dive', details: 'Tune query execution, manage locks, and resolve database deadlocks.', tasks: '[ ] Practice index tuning; [ ] Write raw SQL optimizing slow subqueries; [ ] Study database locks (Shared, Exclusive)' },
      { day: 48, title: 'Behavioral Prep - Failure Stories', details: 'Structure engaging stories about technical failures and how you bounced back.', tasks: '[ ] Draft 2 failure stories with positive takeaways; [ ] Standardize metrics proving progress; [ ] Refine verbal delivery' },
      { day: 49, title: 'Week 7 Review & Apply', details: 'Submit final batch of applications and relax before the interview peak.', tasks: '[ ] Apply to 5 new target roles; [ ] Review system design templates; [ ] Recharge' }
    ]
  },
  {
    week: 8,
    focus: 'Peak Interview & Negotiation',
    summary: 'Keep focus sharp. Perfect your salary negotiations, review your cheat sheets, and ace the live rounds.',
    days: [
      { day: 50, title: 'Final Technical Checklist', details: 'Review the technical checklist containing algorithms, complexity classes, and architectural systems.', tasks: '[ ] Review Big-O complexity cheat sheet; [ ] Read system design checklist; [ ] Review target SQL commands' },
      { day: 51, title: 'Salary Negotiation Prep', details: 'Learn negotiation principles, research standard bands, and prepare counter-offers.', tasks: '[ ] Research market salary rates on Levels.fyi; [ ] Practice counter-offer scripts; [ ] List non-compensation must-haves' },
      { day: 52, title: 'Live Technical Review', details: 'Spend brief blocks reviewing past coding challenges and structural layouts.', tasks: '[ ] Spend 1 hour reviewing 10 hardest LC solutions; [ ] Spend 30 mins sketching 3 top architectures; [ ] Review system flow diagrams' },
      { day: 53, title: 'Final Behavioral Read-through', details: 'Read all behavioral prep scripts and STAR worksheets.', tasks: '[ ] Read through all 10 STAR stories; [ ] Practice elevator pitch in front of mirror; [ ] Formulate 5 questions for the interviewer' },
      { day: 54, title: 'Follow-up Email Templates', details: 'Draft follow-ups, thank you notes, and updates for recruiters.', tasks: '[ ] Draft thank you email template; [ ] Build follow-up template for delayed feedback; [ ] Standardize thank you points' },
      { day: 55, title: 'Celebrate Success!', details: 'Relax, reward yourself for the hard work, and celebrate your progression.', tasks: '[ ] Log study milestone completed; [ ] Organize final tracker dashboard; [ ] Relax!' },
      { day: 56, title: 'Plan Future Progression', details: 'Assess your next steps, map out your career goals, and enjoy your new software role.', tasks: '[ ] Plan next learning goals; [ ] Clean up interview tracker; [ ] Enjoy your success!' }
    ]
  }
];

const DE_ROADMAP = [
  {
    week: 1,
    focus: 'Foundations & Data Modeling',
    summary: 'Kick off your Data Engineering preparation by setting up your tracker, researching companies, and reviewing advanced SQL constraints.',
    days: [
      { day: 1, title: 'Set up Tracker & DE Target Roles', details: 'Build your job search system. Add 10-20 target data engineer roles at leading tech companies.', tasks: '[ ] Build job tracker; [ ] Collect 15 DE job listings; [ ] List 10 tier-1 target companies' },
      { day: 2, title: 'DE Resume Draft & Keywords', details: 'Integrate big data keywords (Spark, Airflow, Snowflake, ETL) into experience statements.', tasks: '[ ] Revise experience using impact metrics; [ ] Perform DE keyword matching; [ ] Build resume draft' },
      { day: 3, title: 'DE GitHub Showcase Polish', details: 'Build a great showcase. Add clean architecture diagrams and sample datasets to your pipeline repositories.', tasks: '[ ] Add architecture diagram to flagship ETL repo; [ ] Clean up GitHub repositories; [ ] Update LinkedIn and bio' },
      { day: 4, title: 'Python for Data Engineers', details: 'Review Python object-oriented programming, generator patterns, list comprehensions, and JSON file parsing.', tasks: '[ ] Review generators and yielding; [ ] Build simple JSON log parser; [ ] Solve 3 LeetCode string easy' },
      { day: 5, title: 'SQL Foundations & Aggregations', details: 'Review advanced SQL basics (joins, grouping, grouping sets, rollup, and cube aggregations).', tasks: '[ ] Practice GROUP BY, GROUPING SETS, and ROLLUP; [ ] Solve 5 intermediate SQL problems; [ ] Study index types' },
      { day: 6, title: 'Dimensional Modeling - Star Schemas', details: 'Master dimensional modeling. Learn about facts, dimensions, primary keys, and foreign keys.', tasks: '[ ] Study Kimball methodology; [ ] Design star schema for e-commerce transactions; [ ] Differentiate Fact vs Dimension tables' },
      { day: 7, title: 'Week 1 Review & Rest', details: 'Consolidate Python and SQL basics, check study logs, and take rest.', tasks: '[ ] Log SQL aggregations confidence; [ ] Review Week 1 gaps; [ ] Plan next week' }
    ]
  },
  {
    week: 2,
    focus: 'Advanced SQL & Data Lakes',
    summary: 'Master analytical SQL queries and database internals alongside cloud storage paradigms.',
    days: [
      { day: 8, title: 'Advanced SQL - Window Functions', details: 'Tackle ranking, lead/lag comparisons, and running aggregates in complex analytical setups.', tasks: '[ ] Study LEAD, LAG, ROW_NUMBER, and DENSE_RANK; [ ] Practice 5 window function queries; [ ] Solve 2 hard window problems' },
      { day: 9, title: 'Database Internals & Partitioning', details: 'Understand database indexing, columnar storage (Parquet, ORC), partitioning, and clustering.', tasks: '[ ] Study B-Trees vs Columnar storage; [ ] Map partition strategies for huge datasets; [ ] Compare Parquet vs CSV benchmark' },
      { day: 10, title: 'Cloud Data Lakes Foundations', details: 'Learn Object Storage concepts, directory structures, and bucket partitioning strategies in AWS S3, GCS, or Azure Blob.', tasks: '[ ] Study S3 object storage; [ ] Design file prefix partitioning strategy; [ ] Compare Data Lake vs Data Warehouse' },
      { day: 11, title: 'Flagship ETL Project Spec', details: 'Draft a comprehensive spec for a pipeline project demonstrating ETL/ELT concepts.', tasks: '[ ] Outline flagship ETL project architecture; [ ] Draft schema layout for staging and production tables; [ ] Setup Git repository' },
      { day: 12, title: 'Timed SQL Coding Mock', details: 'Solve 2 complex data manipulation problems under a 45-minute timer.', tasks: '[ ] Solve 2 LeetCode SQL medium questions under timer; [ ] Dry-run queries on paper; [ ] Self-evaluate execution efficiency' },
      { day: 13, title: 'SCD Types (Slowly Changing Dimensions)', details: 'Master Slowly Changing Dimensions: Type 1, Type 2, Type 3, and Type 4 tracking.', tasks: '[ ] Study SCD Type 1 vs Type 2; [ ] Write SQL query implementing SCD Type 2 merge; [ ] Document SCD types trade-offs' },
      { day: 14, title: 'Week 2 Review & Apply', details: 'Submit applications for active DE roles and review index optimization.', tasks: '[ ] Apply to 3 target DE roles; [ ] Review window function queries; [ ] Log study hours' }
    ]
  },
  {
    week: 3,
    focus: 'Big Data Core - Apache Spark',
    summary: 'Deep dive into Apache Spark architecture, transformations, actions, and lazy evaluation.',
    days: [
      { day: 15, title: 'Apache Spark Architecture', details: 'Study driver nodes, executors, cluster managers, JVM, tasks, slots, and memory configurations.', tasks: '[ ] Map Spark execution lifecycle; [ ] Study Driver vs Executor memory; [ ] Read architecture overview' },
      { day: 16, title: 'Spark Core - RDDs vs DataFrames', details: 'Understand resilient distributed datasets (RDDs), Spark DataFrames, and Catalyst Optimizer.', tasks: '[ ] Compare RDD vs DataFrame; [ ] Study lazy evaluation and execution plan lineage; [ ] Write basic DataFrame transformations' },
      { day: 17, title: 'Spark Transformations & Actions', details: 'Differentiate narrow transformations (map, filter) from wide transformations (groupby, join) causing shuffles.', tasks: '[ ] Study narrow vs wide transformation; [ ] Run Spark code containing map and groupBy; [ ] Analyze spark UI shuffle output' },
      { day: 18, title: 'Data Cleaning in Spark', details: 'Write robust Spark scripts for duplicate handling, null imputation, timestamp conversions, and data casting.', tasks: '[ ] Write Spark duplicate drop script; [ ] Impute missing values using Spark Functions; [ ] Convert timezone timestamp column' },
      { day: 19, title: 'Big Data File Formats - Parquet', details: 'Understand column pruning, predicate pushdown, and Parquet storage mechanisms.', tasks: '[ ] Study columnar file storage layout; [ ] Write DataFrame to partitioned Parquet files; [ ] Benchmark query speed of CSV vs Parquet' },
      { day: 20, title: 'Spark SQL & Catalyst Optimizer', details: 'Utilize Spark SQL. Understand Logical Plan, Physical Plan, and Code Generation.', tasks: '[ ] Write Spark SQL query; [ ] Analyze query plan using `.explain(True)`; [ ] Identify optimization blocks' },
      { day: 21, title: 'Week 3 Review & Apply', details: 'Review wide transformations and submit new job applications.', tasks: '[ ] Apply to 3 job listings; [ ] Review Spark UI details; [ ] Recharge' }
    ]
  },
  {
    week: 4,
    focus: 'Advanced Spark Tuning & Lakehouses',
    summary: 'Tackle big data optimization challenges (broadcast joins, skew, data spill) and modern Lakehouse engines.',
    days: [
      { day: 22, title: 'Spark Joins & Broadcast Joins', details: 'Learn Shuffle Hash Joins, Sort Merge Joins, and Broadcast Hash Joins optimization.', tasks: '[ ] Study Sort Merge Join mechanics; [ ] Implement a Broadcast Join in PySpark; [ ] Benchmark Shuffle vs Broadcast Join performance' },
      { day: 23, title: 'Handling Data Skew & Spill', details: 'Master debugging techniques for memory errors, disk spill, and data skew using salting.', tasks: '[ ] Study salting technique for skewed keys; [ ] Read about OOM (Out Of Memory) executor crashes; [ ] Resolve 1 disk spill simulation' },
      { day: 24, title: 'Modern Lakehouses - Delta Lake', details: 'Study ACID transactions, time travel, schema enforcement, and file compaction (OPTIMIZE, Z-ORDER).', tasks: '[ ] Study Delta Lake ACID log mechanism; [ ] Implement a Delta table write with time travel query; [ ] Run COMPACT and OPTIMIZE operations' },
      { day: 25, title: 'NoSQL Databases in Data Pipelines', details: 'Learn when to use NoSQL models. Study Cassandra, DynamoDB, MongoDB, and HBase.', tasks: '[ ] Differentiate Key-Value vs Document vs Column-family DBs; [ ] Design Cassandra table for high-throughput time-series logs; [ ] Explain primary/partition keys' },
      { day: 26, title: 'Pipeline Scheduling & Airflow Basics', details: 'Introduction to pipeline orchestration. Learn Directed Acyclic Graphs (DAGs), operators, and tasks.', tasks: '[ ] Study DAG structural concepts; [ ] Build a simple 3-task Airflow DAG script; [ ] Compare Airflow Operators vs Sensors' },
      { day: 27, title: 'Mock Interview - Big Data Architecture', details: 'Practice system design. Sketch an enterprise-grade analytics pipeline for billions of events.', tasks: '[ ] Design a clickstream pipeline using Kafka, Spark, and Delta Lake; [ ] Calculate cluster sizes; [ ] Address partition skew in diagram' },
      { day: 28, title: 'Week 4 Review & Mid-Point Check', details: 'Verify Spark optimizations and submit job applications.', tasks: '[ ] Review Spark salting logic; [ ] Apply to 4 new DE listings; [ ] Update target company tracker' }
    ]
  },
  {
    week: 5,
    focus: 'Pipeline Orchestration & Warehousing',
    summary: 'Master workflow automation, metadata tracking, and analytical cloud data warehouses (Snowflake).',
    days: [
      { day: 29, title: 'Apache Airflow - Dynamic DAGs', details: 'Learn dynamic DAG generation, TaskFlow API, XComs data sharing, and SLA triggers.', tasks: '[ ] Build Airflow DAG dynamically from config; [ ] Pass state using XComs / TaskFlow; [ ] Configure email SLAs on task failure' },
      { day: 30, title: 'Backfilling & Idempotency', details: 'Master the golden rule of pipeline orchestration: idempotency. Learn how to safely backfill historical execution dates.', tasks: '[ ] Study idempotency concepts; [ ] Write Airflow DAG with execution_date parameter; [ ] Simulate 3 backfills without duplicates' },
      { day: 31, title: 'Data Warehouse - Snowflake Architecture', details: 'Study Snowflake separation of storage and compute, micro-partitions, and virtual warehouses.', tasks: '[ ] Map Snowflake storage-compute layout; [ ] Differentiate clustering keys vs automatic clustering; [ ] Compare Snowflake vs Redshift' },
      { day: 32, title: 'Snowflake Loading - Snowpipe', details: 'Build real-time automated data loading workflows using Snowpipe and external stages.', tasks: '[ ] Study COPY INTO vs Snowpipe; [ ] Configure Snowflake stage pointing to S3/Blob; [ ] Design Snowpipe flow auto-triggering on file upload' },
      { day: 33, title: 'ELT Pipeline Modeling - dbt Basics', details: 'Learn data build tool (dbt), models, materializations (tables, views, incremental), and documentation.', tasks: '[ ] Build basic dbt model; [ ] Configure incremental materialization; [ ] Run dbt tests verifying unique/non-null constraints' },
      { day: 34, title: 'Data Warehousing - Cluster Ingestion', details: 'Optimize cluster size and warehouse suspend policies to reduce cost and runtime.', tasks: '[ ] Write SQL optimizing dbt runtime in Snowflake; [ ] Study multi-cluster warehouse scaling; [ ] Configure warehouse auto-suspend' },
      { day: 35, title: 'Week 5 Review & Rest', details: 'Consolidate Airflow dynamic tasks, review dbt test patterns, and take rest.', tasks: '[ ] Log dbt model confidence; [ ] Review Airflow backfill scenarios; [ ] Rest' }
    ]
  },
  {
    week: 6,
    focus: 'Real-time Streaming & Ingestion',
    summary: 'Learn streaming architectures, Apache Kafka fundamentals, and real-time ingestion patterns.',
    days: [
      { day: 36, title: 'Streaming Core - Kafka Architecture', details: 'Study topics, partitions, producers, consumers, consumer groups, brokers, ZooKeeper, and KRaft.', tasks: '[ ] Map Kafka producer-consumer lifecycle; [ ] Study partition distribution and consumer rebalancing; [ ] Read Kafka internals' },
      { day: 37, title: 'Kafka message ordering & Delivery', details: 'Understand at-least-once, at-most-once, and exactly-once delivery guarantees. Learn message keys.', tasks: '[ ] Map exactly-once delivery configurations; [ ] Explain message ordering guarantees within partitions; [ ] Write code detailing consumer offsets commit' },
      { day: 38, title: 'Structured Streaming in Spark', details: 'Write real-time ingestion scripts using PySpark Structured Streaming reading from Kafka.', tasks: '[ ] Write Spark Structured Streaming read script; [ ] Apply window aggregation to stream data; [ ] Write streaming data to Delta Lake stage' },
      { day: 39, title: 'Data Ingestion - CDC (Change Data Capture)', details: 'Learn Debezium, Kafka Connect, and how to stream transactional database changes to data lakes.', tasks: '[ ] Study log-based CDC vs query-based CDC; [ ] Design change capture architecture mapping Postgres to Kafka; [ ] Discuss CDC trade-offs' },
      { day: 40, title: 'Timed System Design Mock', details: 'Complete a timed streaming system design challenge.', tasks: '[ ] Design real-time ridesharing geo-tracking pipeline; [ ] Identify broker scaling bottlenecks; [ ] Self-evaluate partition allocation' },
      { day: 41, title: 'Behavioral Prep - DE Scenarios', details: 'Structure behavioral answers addressing pipeline failures, late-arriving data, or downstream customer complaints.', tasks: '[ ] Document 2 pipeline failure stories; [ ] Draft late-arriving data mitigation patterns; [ ] Practice STAR delivery' },
      { day: 42, title: 'Week 6 Review & Apply', details: 'Apply to active openings and review Kafka message serialization (Avro, Schema Registry).', tasks: '[ ] Apply to 5 DE openings; [ ] Study Avro schema serialization; [ ] Log study gaps' }
    ]
  },
  {
    week: 7,
    focus: 'Data Quality, Governance & Cloud',
    summary: 'Focus on cloud service integrations, data quality frameworks, metadata tracking, and CI/CD pipelines.',
    days: [
      { day: 43, title: 'Data Quality Frameworks', details: 'Implement Great Expectations or dbt test assertions to enforce strict pipeline thresholds.', tasks: '[ ] Build Great Expectations validation suite; [ ] Set up automatic anomaly detection on row count; [ ] Write pipeline alert webhook' },
      { day: 44, title: 'Data Lineage & Metadata Governance', details: 'Understand data cataloging, lineage tracking, and metadata schemas (OpenLineage, Amundsen).', tasks: '[ ] Study metadata governance concepts; [ ] Map pipeline data lineage graph; [ ] Differentiate Technical vs Business Metadata' },
      { day: 45, title: 'Cloud Integration - AWS EMR & Athena', details: 'Study EMR cluster tuning, AWS Glue Catalog setup, and serverless querying using AWS Athena.', tasks: '[ ] Configure AWS Glue catalog table schema; [ ] Write Athena SQL querying S3 Parquet data; [ ] Study Glue crawler optimization' },
      { day: 46, title: 'Pipeline CI/CD & Deployments', details: 'Implement automated testing and deployment for Airflow DAGs and dbt models using GitHub Actions.', tasks: '[ ] Write GitHub Actions workflow running dbt tests; [ ] Configure CI/CD parsing Airflow DAG syntax check; [ ] Setup staging deployment script' },
      { day: 47, title: 'Data Warehousing - Security & Masking', details: 'Study role-based access control (RBAC), row-level security, and dynamic data masking in Snowflake.', tasks: '[ ] Write dynamic masking policy in SQL; [ ] Map out Snowflake RBAC hierarchy; [ ] Differentiate Row-Level vs Column-Level security' },
      { day: 48, title: 'DE Case Studies - Analytics Pipelines', details: 'Read 2 real-world case studies detailing how modern tech teams scale pipelines to petabytes.', tasks: '[ ] Read Netflix Big Data storage case study; [ ] Read Uber real-time dispatch ingestion pipeline; [ ] Write summary bullet points' },
      { day: 49, title: 'Week 7 Review & Apply', details: 'Submit final DE applications batch and review schema migration patterns.', tasks: '[ ] Apply to 5 active DE roles; [ ] Review schema migration steps; [ ] Relax' }
    ]
  },
  {
    week: 8,
    focus: 'DE Final Polish & Offers',
    summary: 'Polish DE interview responses, prepare negotiations, and ace the live rounds.',
    days: [
      { day: 50, title: 'Final DE Checklist', details: 'Review the comprehensive list of data engineering architectures, SQL formulas, and Spark variables.', tasks: '[ ] Review Spark parameters and tuning variables; [ ] Read advanced SQL window patterns checklist; [ ] Review Airflow execution contexts' },
      { day: 51, title: 'DE Salary Bands & Negotiation', details: 'Analyze market salary ranges for senior data engineers and practice counter-offer dialogue.', tasks: '[ ] Research DE salaries on Levels.fyi; [ ] Practice negotiation scripts; [ ] List target equity and sign-on goals' },
      { day: 52, title: 'DE Pipeline Quick Review', details: 'Spend brief blocks reviewing data ingestion, warehousing, and analytics layers.', tasks: '[ ] Sketch 3 streaming pipelines; [ ] Review Snowflake COPY INTO performance; [ ] Review dbt model materializations' },
      { day: 53, title: 'Tutor Q&A Review', details: 'Study all previous study guides, task outputs, and tutor explanations.', tasks: '[ ] Read through all 8 generated study guides; [ ] Dry-run 5 behavioral DE answers; [ ] Review 5 technical interview summaries' },
      { day: 54, title: 'Recruiter Follow-up Scripts', details: 'Prepare thank you and update letters to secure rapid recruitment cycles.', tasks: '[ ] Write thank you message draft; [ ] Create follow-up check template; [ ] Review recruiter contact points' },
      { day: 55, title: 'Celebrate Streaming Success!', details: 'Relax, celebrate your growth, and enjoy your transition to data engineering.', tasks: '[ ] Mark milestone project done; [ ] Check dashboard analytics; [ ] Relax!' },
      { day: 56, title: 'Continuous Career Learning', details: 'Establish goals for your new data engineering role and plan future tooling skillsets.', tasks: '[ ] Map out next big data learning goals; [ ] Archiving interview tracker; [ ] Enjoy your success!' }
    ]
  }
];

const ML_ROADMAP = [
  {
    week: 1,
    focus: 'Math & Data Foundations',
    summary: 'Kick off your ML Engineering preparation by reviewing linear algebra, calculus, and processing pipelines using NumPy/Pandas.',
    days: [
      { day: 1, title: 'Set up Tracker & MLE target roles', details: 'Create your search directory. List 10-20 specialized MLE/AI engineer vacancies at tech firms.', tasks: '[ ] Setup job search directory; [ ] Collect 15 MLE job listings; [ ] List 10 tier-1 AI firms' },
      { day: 2, title: 'MLE Resume Draft & Keywords', details: 'Integrate machine learning, deep learning, PyTorch, and MLops keywords into your resume.', tasks: '[ ] Redraft experience using MLE STAR points; [ ] Run keywords analysis on MLE listings; [ ] Build resume PDF draft' },
      { day: 3, title: 'GitHub AI Project Showcase', details: 'Maximize impact. Add model evaluation plots, metrics, and deployment instructions to your AI repos.', tasks: '[ ] Add model performance charts to flagship repo; [ ] Clean up and pin top 3 ML repositories; [ ] Update LinkedIn headline and profile summary' },
      { day: 4, title: 'Mathematics - Linear Algebra', details: 'Review vectors, matrices, eigenvalues, eigenvectors, matrix multiplication, and singular value decomposition (SVD).', tasks: '[ ] Study matrix factorization and SVD; [ ] Practice vector multiplication operations; [ ] Solve 3 easy LeetCode array problems' },
      { day: 5, title: 'Mathematics - Calculus & Probability', details: 'Review partial derivatives, gradients, chain rule, probability distributions, Bayes theorem, and expectation.', tasks: '[ ] Review gradient descent calculus; [ ] Solve 3 Bayes theorem probability problems; [ ] Study standard distribution types' },
      { day: 6, title: 'Data Processing - NumPy & Pandas', details: 'Practice vectorization, array manipulation, data cleaning, aggregation, merging, and reshaping in Pandas.', tasks: '[ ] Write vectorized numpy array script; [ ] Practice Pandas merge, melt, and pivot operations; [ ] Build basic pipeline cleaning missing datasets' },
      { day: 7, title: 'Week 1 Review & Rest', details: 'Log ML mathematics confidence levels, review gaps, and take a rest.', tasks: '[ ] Log ML math confidence; [ ] Review Week 1 learning gaps; [ ] Plan next week' }
    ]
  },
  {
    week: 2,
    focus: 'Classical Machine Learning',
    summary: 'Deep dive into standard supervised and unsupervised machine learning models and optimization methods.',
    days: [
      { day: 8, title: 'Supervised Learning - Linear models', details: 'Understand Linear Regression, Logistic Regression, regularization (L1 Lasso, L2 Ridge), and gradient descent.', tasks: '[ ] Study L1 vs L2 regularization trade-offs; [ ] Implement gradient descent in Python; [ ] Solve LeetCode: Binary Search' },
      { day: 9, title: 'Tree-based Models & Ensemble', details: 'Master Decision Trees, Random Forests, Gradient Boosted Trees (XGBoost, LightGBM), and bagging vs boosting.', tasks: '[ ] Study Bagging vs Boosting concepts; [ ] Build Random Forest classifier using Scikit-Learn; [ ] Compare XGBoost vs LightGBM performance' },
      { day: 10, title: 'Unsupervised Learning & Clustering', details: 'Understand K-Means, DBScan, PCA dimensionality reduction, and clustering evaluations.', tasks: '[ ] Implement K-Means clustering; [ ] Write PCA dimensional reduction script; [ ] Study Silhouette score metric' },
      { day: 11, title: 'ML Flagship Project Architecture', details: 'Map out the training, validation, and deployment layers of your flagship ML project.', tasks: '[ ] Outline flagship ML project layout; [ ] Write STAR document detailing model selection; [ ] Setup Git repository' },
      { day: 12, title: 'Timed ML Coding Mock', details: 'Solve 1 data preprocessing problem and 1 basic algorithm challenge in 45 minutes.', tasks: '[ ] Solve 2 LeetCode easy/medium under timer; [ ] Record self-explaining ML feature engineering; [ ] Evaluate code complexity' },
      { day: 13, title: 'Model Evaluation Metrics', details: 'Master Precision, Recall, F1-Score, ROC-AUC, Precision-Recall Curve, and confusion matrices.', tasks: '[ ] Study ROC-AUC vs Precision-Recall curves; [ ] Calculate F1-score manually; [ ] Write confusion matrix plotting script' },
      { day: 14, title: 'Week 2 Review & Apply', details: 'Apply to target ML roles and review tree-based model trade-offs.', tasks: '[ ] Apply to 3 target MLE roles; [ ] Review Random Forest vs XGBoost details; [ ] Update study logs' }
    ]
  },
  {
    week: 3,
    focus: 'Deep Learning Foundations',
    summary: 'Focus on neural networks, activation functions, backpropagation, and deep learning framework frameworks (PyTorch).',
    days: [
      { day: 15, title: 'Multi-Layer Perceptrons & Backprop', details: 'Understand neural network architecture, weight initialization, activation functions (ReLU, Sigmoid, Softmax), and backpropagation math.', tasks: '[ ] Map out backpropagation chain rule derivatives; [ ] Differentiate Sigmoid vs ReLU activation; [ ] Solve LeetCode: Valid Anagram' },
      { day: 16, title: 'Optimization & Regularization in DL', details: 'Study Adam, SGD with momentum, learning rate schedulers, Dropout, Batch Normalization, and weight decay.', tasks: '[ ] Study batch normalization benefits; [ ] Differentiate Adam vs SGD optimizers; [ ] Implement dropout layer script' },
      { day: 17, title: 'PyTorch Foundations - Datasets', details: 'Learn PyTorch Tensors, custom Datasets, DataLoaders, and training loops.', tasks: '[ ] Build custom PyTorch Dataset class; [ ] Configure DataLoader with batch and shuffling; [ ] Write standard PyTorch training loop' },
      { day: 18, title: 'Convolutional Neural Networks (CNNs)', details: 'Understand convolution operations, pooling layers, receptive fields, and famous CNN architectures (ResNet).', tasks: '[ ] Study CNN pooling and strides arithmetic; [ ] Build basic PyTorch CNN classifier; [ ] Explain ResNet skip connections' },
      { day: 19, title: 'Recurrent Neural Networks & LSTMs', details: 'Learn sequential data models. Understand vanishing/exploding gradients, RNNs, LSTMs, and GRUs.', tasks: '[ ] Study vanishing gradient solutions in LSTM; [ ] Implement PyTorch LSTM cell; [ ] Compare RNN vs LSTM' },
      { day: 20, title: 'Deep Learning Debugging Techniques', details: 'Learn to debug exploding gradients, model overfitting, and learning rate scheduling problems.', tasks: '[ ] Study gradient clipping strategies; [ ] Plot training vs validation loss curve; [ ] Troubleshoot NaN loss errors' },
      { day: 21, title: 'Week 3 Review & Apply', details: 'Review deep learning backprop and submit applications to active ML vacancies.', tasks: '[ ] Apply to 3 job listings; [ ] Review PyTorch training loops; [ ] Recharge' }
    ]
  },
  {
    week: 4,
    focus: 'NLP & Transformers',
    summary: 'Master Natural Language Processing (NLP) models, attention mechanisms, and Transformer architectures.',
    days: [
      { day: 22, title: 'Classical NLP - TF-IDF & Word2Vec', details: 'Learn feature representation in text. Study TF-IDF, Word2Vec, GloVe, and tokenization.', tasks: '[ ] Study Word2Vec Skip-gram vs CBOW; [ ] Write script calculating TF-IDF; [ ] Practice tokenization' },
      { day: 23, title: 'Transformer Core - Attention Mechanism', details: 'Deep dive into Self-Attention, Multi-Head Attention, Scaled Dot-Product, and positional encoding.', tasks: '[ ] Study Multi-Head Attention math formula; [ ] Code self-attention mechanism in NumPy; [ ] Explain positional encodings benefit' },
      { day: 24, title: 'Transformer Architecture - Encoder/Decoder', details: 'Understand complete Transformer pipeline. Differentiate BERT (Encoder-only) vs GPT (Decoder-only).', tasks: '[ ] Map complete Transformer block architecture; [ ] Differentiate BERT vs GPT training paradigms; [ ] Load pre-trained BERT from Hugging Face' },
      { day: 25, title: 'Fine-Tuning BERT / GPT Models', details: 'Write training loops for task-specific classification head fine-tuning in PyTorch/Hugging Face.', tasks: '[ ] Write fine-tuning pipeline for BERT classification; [ ] Configure trainer arguments; [ ] Evaluate performance on validation set' },
      { day: 26, title: 'System Design - NLP Applications', details: 'Study high-throughput text classification, auto-complete, and semantic search systems.', tasks: '[ ] Design semantic search system using embeddings; [ ] Map text classification pipeline architecture; [ ] Address latency bottlenecks' },
      { day: 27, title: 'Mock Interview - DL & NLP Systems', details: 'Complete mock system design challenge on NLP and deep learning models.', tasks: '[ ] Design a spam detection system for email scaling to millions; [ ] Address classification metrics; [ ] Discuss online model training trade-offs' },
      { day: 28, title: 'Week 4 Review & Mid-Point Check', details: 'Verify Transformer attention mechanisms and submit new MLE job applications.', tasks: '[ ] Review self-attention calculations; [ ] Apply to 4 new MLE listings; [ ] Update target company tracker' }
    ]
  },
  {
    week: 5,
    focus: 'LLMs & Generative AI',
    summary: 'Master Large Language Models (LLMs), prompt engineering, retrieval-augmented generation (RAG), and vector databases.',
    days: [
      { day: 29, title: 'LLM Architectures & Quantization', details: 'Study Llama, Mistral, parameters size, quantization (INT8, FP4), and parameter-efficient fine-tuning (PEFT/LoRA).', tasks: '[ ] Study LoRA (Low-Rank Adaptation) math; [ ] Load quantized Mistral-7B in Python; [ ] Differentiate full fine-tuning vs PEFT' },
      { day: 30, title: 'Prompt Engineering & LangChain', details: 'Understand zero-shot, few-shot, Chain-of-Thought prompts, and LangChain prompt templates.', tasks: '[ ] Practice few-shot prompt templates; [ ] Build simple Chain-of-Thought agent; [ ] Implement LangChain pipeline' },
      { day: 31, title: 'RAG - Vector DBs & Retrievers', details: 'Build RAG pipelines. Learn chunking strategies, embeddings, cosine similarity, Pinecone, and Chroma.', tasks: '[ ] Study recursive character chunking; [ ] Build vector search index in Chroma; [ ] Query vector index using cosine similarity' },
      { day: 32, title: 'Agentic AI & Function Calling', details: 'Build AI agents capable of reasoning, utilizing tools, and resolving database queries.', tasks: '[ ] Implement ReAct (Reasoning and Acting) prompt loop; [ ] Build agent capable of API function calling; [ ] Troubleshoot agent loop errors' },
      { day: 33, title: 'LLM Evaluation & Guardrails', details: 'Learn to evaluate LLM responses using RAGAS, BLEU, ROUGE, and enforce safety guardrails.', tasks: '[ ] Study BLEU vs ROUGE scores; [ ] Configure NeMo Guardrails check; [ ] Write Python evaluation pipeline' },
      { day: 34, title: 'System Design - Generative AI app', details: 'Design high-volume RAG-based virtual assistant systems for corporate datasets.', tasks: '[ ] Design secure, scalable enterprise RAG system; [ ] Map vector database sync processes; [ ] Calculate embedding cache sizes' },
      { day: 35, title: 'Week 5 Review & Rest', details: 'Consolidate LoRA parameters, review RAG chunking techniques, and take rest.', tasks: '[ ] Log PEFT/LoRA confidence; [ ] Review RAG chunking strategies; [ ] Rest' }
    ]
  },
  {
    week: 6,
    focus: 'MLOps & In-Production ML',
    summary: 'Learn production machine learning, automated pipelines, model serving, and continuous monitoring.',
    days: [
      { day: 36, title: 'Model Serialization & FastAPI Serving', details: 'Learn model serialization (ONNX, Pickle) and build performant REST APIs for real-time scoring.', tasks: '[ ] Serialize Scikit-Learn model to ONNX format; [ ] Build FastAPI serving ML predictions; [ ] Benchmark API latency for 100 concurrent requests' },
      { day: 37, title: 'Containerization & Docker for ML', details: 'Create reproducible Docker containers for model inference APIs.', tasks: '[ ] Write Dockerfile packaging FastAPI serving pipeline; [ ] Build and test Docker image locally; [ ] Study multi-stage Docker builds' },
      { day: 38, title: 'Feature Stores - Feast Basics', details: 'Learn feature store concepts. Study feature definition, online vs offline stores, and Feast setup.', tasks: '[ ] Differentiate Online vs Offline feature stores; [ ] Write Feast feature definition file; [ ] Retrieve offline features for model training' },
      { day: 39, title: 'Model Monitoring & Data Drift', details: 'Learn data drift, concept drift, model decay, and Evidently AI monitoring dashboards.', tasks: '[ ] Study Kolmogorov-Smirnov test for data drift; [ ] Build Evidently AI drift report; [ ] Map out automated model retraining trigger flow' },
      { day: 40, title: 'Mock Interview - MLOps System Design', details: 'Complete mock system design simulation focusing on deployment, scalability, and serve latency.', tasks: '[ ] Design high-scale ad CTR prediction service; [ ] Address feature serving latency; [ ] Address model update strategy (A/B testing)' },
      { day: 41, title: 'Behavioral Prep - ML Scenarios', details: 'Structure behavioral stories addressing model degradations, data leakage, and team resource conflicts.', tasks: '[ ] Document 2 model degradation stories; [ ] Draft data leakage mitigation frameworks; [ ] Practice STAR pitch out loud' },
      { day: 42, title: 'Week 6 Review & Apply', details: 'Submit new MLE applications and review Feast feature store setups.', tasks: '[ ] Apply to 5 MLE active openings; [ ] Study model drift statistical tests; [ ] Log study gaps' }
    ]
  },
  {
    week: 7,
    focus: 'Advanced ML System Design',
    summary: 'Focus on high-scale enterprise machine learning architectures (Recommendation Engines, Search).',
    days: [
      { day: 43, title: 'Recommendation Engine Design', details: 'Design end-to-end recommendation pipelines. Learn collaborative filtering, two-stage retrieval (Candidate Gen, Ranking).', tasks: '[ ] Design 2-stage recommendation system; [ ] Differentiate Collaborative Filtering vs Content-Based; [ ] Model candidate generation database queries' },
      { day: 44, title: 'Search & Ranking System Design', details: 'Design search systems. Learn query expansion, document embeddings retrieval, and Learning-to-Rank models.', tasks: '[ ] Design search system layout; [ ] Study Learning-to-Rank models; [ ] Address query cache optimization' },
      { day: 45, title: 'Deep Learning Serving - Triton server', details: 'Study Triton Inference Server, GPU utilization, dynamic batching, and concurrent model execution.', tasks: '[ ] Study Triton Inference Server GPU batching; [ ] Map out Triton concurrent execution flow; [ ] Compare CPU vs GPU serving' },
      { day: 46, title: 'Flagship ML Project serving code', details: 'Polish serving and inference code for flagship project, package, and write deployment script.', tasks: '[ ] Package ML model serving pipeline; [ ] Write automated model testing suite; [ ] Build deployment pipeline' },
      { day: 47, title: 'Data Leakage & Cross-Validation', details: 'Understand data leakage vectors. Master advanced cross-validation (K-Fold, Stratified, Time-Series split).', tasks: '[ ] Study time-series cross-validation split; [ ] Audit project for feature leakage; [ ] Write stratified K-Fold cross-validation script' },
      { day: 48, title: 'MLE Case Studies - High Scale AI', details: 'Read 2 real-world case studies detailing how modern companies scale ML models to billions of queries.', tasks: '[ ] Read YouTube recommendation system paper; [ ] Read Airbnb search ranking optimization paper; [ ] Write summary bullet points' },
      { day: 49, title: 'Week 7 Review & Apply', details: 'Submit final batch of MLE applications and review recommendation metrics (NDCG, MAP).', tasks: '[ ] Apply to 5 new MLE target roles; [ ] Review NDCG and MAP metrics; [ ] Recharge' }
    ]
  },
  {
    week: 8,
    focus: 'MLE Final Polish & Offers',
    summary: 'Polish MLE interview responses, prepare negotiations, and ace the live rounds.',
    days: [
      { day: 50, title: 'Final MLE Checklist', details: 'Review the comprehensive list of MLE systems, parameters, and serving optimization tricks.', tasks: '[ ] Review neural network architectures checklist; [ ] Read dynamic batch serving serving cheatsheet; [ ] Review ML metrics formulas' },
      { day: 51, title: 'MLE Salary Bands & Negotiation', details: 'Research market compensation figures for senior ML engineers and rehearse counter-offer dialogue.', tasks: '[ ] Research MLE salary benchmarks on Levels.fyi; [ ] Rehearse salary negotiation counter-offers; [ ] Outline desired work perks' },
      { day: 52, title: 'MLE serving quick check', details: 'Review model training pipelines, served API latency parameters, and containerization configs.', tasks: '[ ] Review Triton batch params; [ ] Check Docker build steps; [ ] Sketch 3 recommendation architectures' },
      { day: 53, title: 'MLE Tutor Q&A Review', details: 'Study all previous study guides, task outputs, and tutor explanations.', tasks: '[ ] Read through all 8 generated study guides; [ ] Dry-run 5 behavioral MLE answers; [ ] Review 5 technical interview summaries' },
      { day: 54, title: 'Recruiter Follow-up Scripts', details: 'Draft follow-ups, thank you notes, and updates for recruiters.', tasks: '[ ] Write thank you message draft; [ ] Create follow-up check template; [ ] Review recruiter contact points' },
      { day: 55, title: 'Celebrate AI Success!', details: 'Relax, celebrate your hard work, and enjoy your new machine learning role.', tasks: '[ ] Mark milestone project done; [ ] Check dashboard analytics; [ ] Relax!' },
      { day: 56, title: 'Plan AI Progression', details: 'Assess your next steps, map out your career goals, and enjoy your new ML engineer role.', tasks: '[ ] Plan next AI learning goals; [ ] Archiving interview tracker; [ ] Enjoy your success!' }
    ]
  }
];

const TRACKS = [
  { id: 'swe', name: '💻 Software Engineering', data: SWE_ROADMAP },
  { id: 'de', name: '🎛️ Data Engineering', data: DE_ROADMAP },
  { id: 'ml', name: '🧠 Machine Learning & AI', data: ML_ROADMAP },
  { id: 'ai', name: '✨ Custom AI', data: null }
];

export default function RoadmapPage() {
  const navigate = useNavigate();
  const [activeTrack, setActiveTrack] = useState('swe');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [hoursPlanned, setHoursPlanned] = useState(3.0);
  const [isSeeding, setIsSeeding] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const [showMergePrompt, setShowMergePrompt] = useState(false);
  const [trackNameInput, setTrackNameInput] = useState('');
  
  const [aiQuery, setAiQuery] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [customRoadmap, setCustomRoadmap] = useState(null);
  const [aiError, setAiError] = useState(null);

  const currentRoadmap = activeTrack === 'ai' ? customRoadmap : TRACKS.find(t => t.id === activeTrack).data;

  const generateCustomRoadmap = async () => {
    const gatewayUrl = localStorage.getItem('AI_GATEWAY_URL') || '';
    const apiKey = localStorage.getItem('AI_API_KEY');
    let model = localStorage.getItem('AI_MODEL') || 'gemini-1.5-flash';

    if (!apiKey) {
      setAiError('Please set your AI API Key in the Settings page first.');
      return;
    }
    if (!aiQuery.trim()) {
      setAiError('Please enter a role or topic to generate a roadmap for.');
      return;
    }

    setIsGeneratingAI(true);
    setAiError(null);
    setCustomRoadmap(null);

    const prompt = `I am preparing for an interview or learning journey. My goal role/topic is: "${aiQuery}".
Please act as an expert technical career coach. Generate a comprehensive 8-week (56-day) curriculum roadmap for this role.
You MUST output ONLY a raw JSON array (no markdown code blocks, just raw JSON).
The JSON array must have exactly 8 objects (one for each week).
Each week object must match this structure exactly:
{
  "week": <number>,
  "focus": "<string>",
  "summary": "<string>",
  "days": [
    {
      "day": <number 1-7 for this week>,
      "title": "<string>",
      "details": "<string>",
      "tasks": "[ ] Task 1; [ ] Task 2; [ ] Task 3" 
    }
  ]
}`;

    try {
      let url = '';
      let headers = {};
      let body = {};
      
      if (/generativelanguage\.googleapis\.com/.test(gatewayUrl)) {
        url = `${gatewayUrl.replace(/\/$/, '')}/${model}:generateContent?key=${apiKey}`;
        headers = { 'Content-Type': 'application/json' };
        body = { contents: [{ parts: [{ text: prompt }] }] };
      } else {
        url = gatewayUrl.endsWith('/v1/chat/completions') ? gatewayUrl : `${gatewayUrl.replace(/\/$/, '')}/v1/chat/completions`;
        headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` };
        body = {
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7
        };
      }

      const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errText}`);
      }
      const data = await response.json();
      
      let text = '';
      if (data.choices && data.choices[0]?.message?.content) {
        text = data.choices[0].message.content;
      } else if (data.candidates && data.candidates[0]?.content?.parts) {
        text = data.candidates[0].content.parts.map(p => p.text).join('\n');
      } else {
        text = JSON.stringify(data);
      }

      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("AI did not return a valid JSON array.");
      
      setCustomRoadmap(parsed);
    } catch (e) {
      console.error(e);
      setAiError("Failed to generate roadmap: " + e.message);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleLoadRoadmapClick = () => {
    let defaultTrackName = TRACKS.find(t => t.id === activeTrack).name;
    if (activeTrack === 'ai' && aiQuery.trim()) {
      defaultTrackName = `Custom: ${aiQuery.trim()}`;
    }
    setTrackNameInput(defaultTrackName);
    setShowMergePrompt(true);
  };

  const confirmLoadRoadmap = async (strategy) => {
    const finalTrackName = trackNameInput.trim() || 'Default';
    setShowMergePrompt(false);

    setIsSeeding(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const baseDate = new Date(startDate);
      const bulkPlans = [];

      currentRoadmap.forEach(weekData => {
        weekData.days.forEach(dayData => {
          // Calculate calendar date for this specific day
          const planDate = new Date(baseDate);
          planDate.setDate(baseDate.getDate() + (dayData.day - 1));

          bulkPlans.push({
            day: dayData.day,
            date: planDate.toISOString().split('T')[0],
            week: `Week ${weekData.week}`,
            focus_area: dayData.title,
            tasks: dayData.tasks,
            hours_planned: Number(hoursPlanned),
            status: 'Not Started',
            notes: dayData.details
          });
        });
      });

      const response = await bulkCreateDailyPlans({
        track_name: finalTrackName,
        plans: bulkPlans,
        merge_strategy: strategy
      });

      if (response.data && response.data.ok) {
        setSuccessMsg(`🎉 Successfully loaded all 56 days of the ${activeTrack.toUpperCase()} roadmap into your Daily Plans! Redirecting you now...`);
        setTimeout(() => {
          navigate('/daily');
        }, 2500);
      } else {
        throw new Error("Bulk upload succeeded but returned an invalid status.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(`❌ Failed to seed roadmap into Daily Plans: ${err.message || 'Check connection or backend logs.'}`);
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="section-card" style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <div style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
        <h1 className="section-title" style={{ fontSize: '2.25rem', marginBottom: '0.5rem', background: 'linear-gradient(135deg, var(--accent) 0%, #4f46e5 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          🚀 Professional Interview Roadmaps
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', maxWidth: '700px', margin: '0 auto' }}>
          Select a specialized career track curriculum, adjust your target start date, and load all 56 days of high-quality study tasks directly into your Daily Plans dashboard timeline.
        </p>
      </div>

      {/* TRACK SELECTOR TABS */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
        {TRACKS.map(track => (
          <button
            key={track.id}
            onClick={() => setActiveTrack(track.id)}
            className={`btn ${activeTrack === track.id ? 'btn-primary' : 'btn-ghost'}`}
            style={{
              padding: '0.8rem 1.5rem',
              fontSize: '1rem',
              borderRadius: '2rem',
              transition: 'all 0.3s ease',
              boxShadow: activeTrack === track.id ? '0 4px 14px rgba(79, 70, 229, 0.4)' : 'none'
            }}
          >
            {track.name}
          </button>
        ))}
      </div>

      {activeTrack === 'ai' && !customRoadmap && (
        <div className="card" style={{ background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '3rem 2rem', marginBottom: '3rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🤖</div>
          <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>AI Roadmap Generator</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', maxWidth: '500px', margin: '0 auto 2rem' }}>
            Tell the AI what role you're aiming for (e.g., "Senior Frontend Dev", "Cloud Architect", "Product Manager") and it will build a custom 56-day syllabus just for you.
          </p>
          
          <div style={{ display: 'flex', gap: '0.5rem', maxWidth: '600px', margin: '0 auto' }}>
            <input 
              type="text" 
              className="form-control" 
              placeholder="e.g. Full-Stack Developer with Node.js & React..." 
              value={aiQuery} 
              onChange={e => setAiQuery(e.target.value)}
              disabled={isGeneratingAI}
              style={{ flex: 1, padding: '0.75rem 1rem', fontSize: '1rem' }}
            />
            <button 
              className="btn btn-primary" 
              onClick={generateCustomRoadmap} 
              disabled={isGeneratingAI}
              style={{ padding: '0.75rem 1.5rem', fontSize: '1rem' }}
            >
              {isGeneratingAI ? 'Generating... ⏳' : 'Generate ✨'}
            </button>
          </div>
          
          {aiError && (
            <div style={{ marginTop: '1.5rem', color: 'var(--danger)', fontSize: '0.9rem', background: 'rgba(239,68,68,0.1)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
              {aiError}
            </div>
          )}
        </div>
      )}

      {currentRoadmap && (
        <>
          {/* ACTION CARD: LOADER SETTINGS */}
      <div className="card" style={{
        background: 'rgba(255, 255, 255, 0.05)',
        border: '2px solid var(--accent-light)',
        borderRadius: 'var(--radius-lg)',
        padding: '2rem',
        marginBottom: '3rem',
        boxShadow: 'var(--shadow-lg)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div style={{ flex: '1', minWidth: '300px' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
              ⚡ Load Track Into Daily Plans
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: 0 }}>
              Instantly populate your checklist with all 56 days of curriculum. This will clear existing plans.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                📅 Target Start Date
              </label>
              <input
                className="form-control"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ width: '160px', padding: '0.5rem 0.75rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                ⏱️ Hours / Day
              </label>
              <input
                className="form-control"
                type="number"
                step="0.5"
                min="0.5"
                max="24"
                value={hoursPlanned}
                onChange={(e) => setHoursPlanned(e.target.value)}
                style={{ width: '100px', padding: '0.5rem 0.75rem' }}
              />
            </div>

            <button
              onClick={handleLoadRoadmapClick}
              disabled={isSeeding}
              className="btn btn-primary"
              style={{
                padding: '0.75rem 1.5rem',
                fontSize: '0.95rem',
                fontWeight: 700,
                background: 'linear-gradient(135deg, var(--accent) 0%, #4f46e5 100%)',
                border: 'none',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
              }}
            >
              {isSeeding ? '⏳ Loading Plans...' : '⚡ Load into Daily Plans'}
            </button>
          </div>
        </div>

        {successMsg && (
          <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', borderRadius: 'var(--radius-md)', fontWeight: 600, border: '1px solid var(--success-light)', textAlign: 'center' }}>
            {successMsg}
          </div>
        )}

        {errorMsg && (
          <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', fontWeight: 600, border: '1px solid var(--danger-light)', textAlign: 'center' }}>
            {errorMsg}
          </div>
        )}
      </div>

      {/* ROADMAP CURRICULUM ACCORDION TIMELINE */}
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        📅 Curated 8-Week Timeline ({currentRoadmap.length} Weeks, 56 Days)
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {currentRoadmap.map(week => (
          <div
            key={week.week}
            className="card"
            style={{
              padding: '2rem',
              background: 'var(--bg-main)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)'
            }}
          >
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
              <div style={{
                background: 'rgba(99, 102, 241, 0.1)',
                color: 'var(--accent)',
                padding: '0.4rem 1rem',
                borderRadius: '2rem',
                fontSize: '0.85rem',
                fontWeight: 800,
                whiteSpace: 'nowrap'
              }}>
                WEEK {week.week}
              </div>
              <div>
                <h3 style={{ fontSize: '1.25rem', margin: '0 0 0.3rem 0', color: 'var(--text-primary)' }}>
                  {week.focus}
                </h3>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.45' }}>
                  {week.summary}
                </p>
              </div>
            </div>

            {/* DAY-BY-DAY LIST */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {week.days.map((d, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    gap: '1rem',
                    padding: '1rem',
                    background: 'var(--bg-main)',
                    borderRadius: 'var(--radius-md)',
                    borderLeft: '4px solid var(--accent-light)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{
                    minWidth: '60px',
                    fontWeight: 800,
                    color: 'var(--accent)',
                    fontSize: '0.95rem'
                  }}>
                    Day {d.day}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 0.4rem 0', fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {d.title}
                    </h4>
                    <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.45' }}>
                      {d.details}
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {d.tasks.split(';').map((task, idx) => (
                        <span
                          key={idx}
                          style={{
                            fontSize: '0.72rem',
                            background: 'rgba(255, 255, 255, 0.05)',
                            padding: '0.25rem 0.6rem',
                            borderRadius: '1rem',
                            border: '1px solid var(--border)',
                            color: 'var(--text-muted)'
                          }}
                        >
                          {task.replace('[ ] ', '')}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      </>)}

      {showMergePrompt && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div style={{
            background: 'var(--bg-main)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: '2.5rem', maxWidth: '500px', width: '90%',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span>⚠️</span> Schedule Conflict
            </h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              You are about to inject <strong>56 new daily plans</strong> into your timeline. How would you like to handle your existing plans?
            </p>

            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                🏷️ Schedule / Track Name
              </label>
              <input 
                type="text" 
                className="form-control" 
                value={trackNameInput} 
                onChange={(e) => setTrackNameInput(e.target.value)} 
                style={{ width: '100%', padding: '0.75rem' }}
                placeholder="e.g. Software Engineering"
              />
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                This lets you toggle between multiple active roadmaps in your Daily Plans view.
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
              <button className="btn btn-outline" style={{ justifyContent: 'flex-start', padding: '1rem', textAlign: 'left', height: 'auto' }} onClick={() => confirmLoadRoadmap('replace_future')}>
                <div>
                  <strong>🔄 Replace Upcoming (Recommended)</strong>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Deletes future scheduled plans and replaces them with this roadmap starting today. Past plans are kept safe.</div>
                </div>
              </button>
              <button className="btn btn-outline" style={{ justifyContent: 'flex-start', padding: '1rem', textAlign: 'left', height: 'auto' }} onClick={() => confirmLoadRoadmap('append')}>
                <div>
                  <strong>➕ Append to End</strong>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Start this roadmap immediately after your last scheduled daily plan.</div>
                </div>
              </button>
              <button className="btn btn-outline" style={{ justifyContent: 'flex-start', padding: '1rem', textAlign: 'left', height: 'auto' }} onClick={() => confirmLoadRoadmap('merge')}>
                <div>
                  <strong>🔀 Merge / Overlap</strong>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Keep all existing plans, and layer the new roadmap on top starting today.</div>
                </div>
              </button>
              <button className="btn btn-outline" style={{ justifyContent: 'flex-start', padding: '1rem', textAlign: 'left', height: 'auto', borderColor: 'var(--danger)', color: 'var(--danger)' }} onClick={() => confirmLoadRoadmap('clear_all')}>
                <div>
                  <strong>🗑️ Clear Everything</strong>
                  <div style={{ fontSize: '0.8rem', opacity: 0.8, marginTop: '0.25rem' }}>Delete ALL past and future daily plans for a fresh start.</div>
                </div>
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setShowMergePrompt(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
