const _ = require('lodash');
const commands = require('probot-commands');

module.exports = app => {
  app.log('Starting assignbot...');

  commands(app, 'assign', async (ctx, cmd) => {
    const match = /@([^\s]+)/g.exec(cmd.arguments);
    if (match.length < 2) return

    const username = match[1];

    const inviteUser = async () => {
      try {
        await ctx.github.repos.addCollaborator({
          ...ctx.issue(),
          username: username,
          permission: 'pull',
        });

      } catch(err) {
        return app.log(`error inviting user: ${err}`);
      }
    }

    try {
      await ctx.github.issues.checkAssignee({
        ...ctx.issue(),
        assignee: username,
      });
    } catch {
      app.log(`Inviting: ${username}`);
      return inviteUser();
    }

    app.log(`Adding ${username}`);
    await ctx.github.issues.addAssignees({
      ...ctx.issue(),
      assignees: [
        username,
      ],
    });
  });

  app.on('member.added', async (ctx, cmd) => {
    const username = ctx.payload.member.login;

    const result = await ctx.github.search.issues({
      q: `mentions:${username} type:issue repo:grampelberg/assignbot in:comments`
    });

    _.each(result.data.items, async item => {
      await ctx.github.issues.addAssignees({
        owner: ctx.payload.repository.owner.login,
        repo: ctx.payload.repository.name,
        number: item.number,
        assignees: [
          ctx.payload.member.login,
        ],
      });
    });
  });
}
