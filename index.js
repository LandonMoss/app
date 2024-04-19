module.exports = wip;

const handlePullRequestChange = require("./lib/handle-pull-request-change");
const handleMarketplacePurchase = require("./lib/handle-marketplace-purchase");
const handleInstallation = require("./lib/handle-installation");

/**
 * @param {import('probot').Probot} app
 */
function wip(app) {
  // listen to all relevant pull request event actions
  app.on(
    [
      "pull_request.opened",
      "pull_request.edited",
      "pull_request.labeled",
      "pull_request.unlabeled",
      "pull_request.synchronize",
    ],
    handlePullRequestChange.bind(null, app),
  );

  // listen to relevant marketplace purchase events
  app.on(
    [
      "marketplace_purchase.purchased",
      "marketplace_purchase.changed",
      "marketplace_purchase.cancelled",
    ],
    handleMarketplacePurchase.bind(null, app),
  );

  // listen to installation events
  app.on(
    ["installation", "installation_repositories"],
    handleInstallation.bind(null, app),
  );
}

//Error handling middleware
app.error((err, context) => {
  console.error(`Error Occured: ${err.message}`);
  context.log.error(err);
  context.github.issues.createComment({
    owner: context.payload.repository.owner.login,
    repo: context.payload.repository.name,
    issue_number: context.payload.issue.number,
    body: `An error occurred while processing your request: ${err.message}`,
  });
});

// Authorization middleware
app.onAny(async (context) => {
  // Implement your authorization logic here
  const isValidRequest = true; // Example logic, replace with your own
  if (!isValidRequest) {
    context.log.warn("Unauthorized request detected");
    context.res.status(403).send("Unauthorized");
  }
});

// Notification middleware
app.onAny(async (context) => {
  // Example: Send a notification to repository owner when a pull request is opened
  if (context.event === "pull_request.opened") {
    const repoOwner = context.payload.repository.owner.login;
    const prAuthor = context.payload.pull_request.user.login;
    context.github.issues.createComment({
      owner: repoOwner,
      repo: context.payload.repository.name,
      issue_number: context.payload.pull_request.number,
      body: `Hi @${prAuthor}, thanks for opening this pull request!`,
    });
  }
});

// Data persistence (Example: Using Probot's `app.cache`)
app.on("pull_request.opened", async (context) => {
  // Store relevant data in cache
  await app.cache.set(`pr_${context.payload.pull_request.id}`, {
    title: context.payload.pull_request.title,
    author: context.payload.pull_request.user.login,
  });
});

// Logging middleware
app.onAny((context) => {
  context.log.info(`${context.event} event received`);
});

// Rate limiting middleware
app.onAny(async (context) => {
  // Implement rate limiting logic here
  // Example: Throttle requests to 1 request per minute
  const key = `${context.id}-${context.event}`;
  const rateLimit = 1; // 1 request per minute
  const remainingRequests = await app.cache.get(key) || rateLimit;
  if (remainingRequests <= 0) {
    context.log.warn("Rate limit exceeded");
    context.res.status(429).send("Rate limit exceeded");
  } else {
    await app.cache.set(key, remainingRequests - 1, {
      ttl: 60, // 1 minute TTL
    });
  }
});

// Testing endpoint
app.on("issues.opened", async (context) => {
  context.log.info("Testing endpoint: Issue opened");
  context.res.end("Test successful");
});

// Documentation
app.on("repository.created", async (context) => {
  const repoOwner = context.payload.repository.owner.login;
  const repoName = context.payload.repository.name;
  const repoUrl = context.payload.repository.html_url;
  const message = `🎉 Congratulations @${repoOwner}! Your repository [${repoName}](${repoUrl}) is now Probot-powered. Check out the documentation for usage instructions.`;
  context.github.issues.createComment({
    owner: repoOwner,
    repo: repoName,
    issue_number: context.payload.repository.id,
    body: message,
  });
});
