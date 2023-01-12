const { Client } = require('pg');

const client = new Client('postgres://localhost:5432/juicebox-dev');

// gets the info for all of our users from the users table
const getAllUsers = async () => {
    const { rows } = await client.query(
        `SELECT id, username, name, location, active
        FROM users;
    `);
    
    return rows;
}

// creates a user on our user table
const createUser = async ({
    username,
    password,
    name,
    location
 }) => {
    try {
        const { rows: [ user ] } = await client.query(`
        INSERT INTO users(username, password, name, location)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (username) DO NOTHING
        RETURNING *;
        `, [ username, password, name, location ]);

        return user;
    } catch (error) {
        throw error;
    }
}

// updates user info for a specific user on our user table
const updateUser = async (id, fields = {}) => {
    const setString = Object.keys(fields).map(
        (key, index) => `"${ key }"=$${ index + 1 }`
    ).join(', ');

    if (setString.length === 0) {
        return;
    }

    try {
        const { rows: [ user ] } = await client.query(`
            UPDATE users
            SET ${ setString }
            WHERE id=${ id }
            RETURNING *;
        `, Object.values(fields));

        return user;
    } catch (error) {
        throw error;
    }
}

// creates a post from a specific user on our posts table
const createPost = async ({
    authorId,
    title,
    content,
    tags = []
}) => {
    try {
        const { rows: [ post ] } = await client.query(`
        INSERT INTO posts("authorId", title, content)
        VALUES ($1, $2, $3)
        RETURNING *;
        `, [ authorId, title, content ]);

        const tagList = await createTags(tags);
        
        return await addTagsToPost(post.id, tagList);
    } catch (error) {
        throw error;
    }
}

// updates a post from with a specific id on our posts table
const updatePost = async (postId, fields = {}) => {
    const { tags } = fields;
    delete fields.tags;
    
    const setString = Object.keys(fields).map(
        (key, index) => `"${ key }"=$${ index + 1 }`
    ).join(', ');

    try {
        if (setString.length > 0) {
            await client.query(`
                UPDATE posts
                SET ${ setString }
                WHERE id=${ postId }
                RETURNING *;
            `, Object.values(fields));
        }
        
        if (tags === undefined) {
            return await getPostById(postId);
        }

        const tagList = await createTags(tags);
        const tagListIdString = tagList.map(
            tag => `${ tag.id }`
        ).join(', ');

        await client.query(`
        DELETE FROM post_tags
        WHERE "tagId"
        NOT IN (${ tagListIdString })
        AND "postId"=$1;
        `, [postId]);

        await addTagsToPost(postId, tagList);

        return await getPostById(postId);
    } catch (error) {
        throw error;
    }
}

// gets a single post from the posts table via its id
const getPostById = async (postId) => {
    try {
      const { rows: [ post ]  } = await client.query(`
        SELECT *
        FROM posts
        WHERE id=$1;
      `, [postId]);
  
      const { rows: tags } = await client.query(`
        SELECT tags.*
        FROM tags
        JOIN post_tags ON tags.id=post_tags."tagId"
        WHERE post_tags."postId"=$1;
      `, [postId])
  
      const { rows: [author] } = await client.query(`
        SELECT id, username, name, location
        FROM users
        WHERE id=$1;
      `, [post.authorId])
  
      post.tags = tags;
      post.author = author;
  
      delete post.authorId;
  
      return post;
    } catch (error) {
      throw error;
    }
}

// gets each of the posts from the posts table utilizing the getPostById() function 
const getAllPosts = async () => {
    try {
        const { rows: postIds } = await client.query(
            `SELECT id
            FROM posts;
        `);
        
        const posts = await Promise.all(postIds.map(
            post => getPostById(post.id)
        ))

        return posts;
    } catch (error) {
        throw error;
    }
}

// gets the postIds of the posts posted by a specific user via their userId and then utilizes the getPostById() function to get those posts
const getPostsByUser = async (userId) => {
    try {
        const { rows: postIds } = await client.query(`
            SELECT id
            FROM posts
            WHERE "authorId"=${ userId };
        `)

        const posts = await Promise.all(postIds.map(
            post => getPostById(post.id)
        ))

        return posts;
    } catch (error) {
        throw error;
    }
}

// gets the user info minus the password of a specific user from the users table
const getUserById = async (userId) => {
    try {
        const { rows: [ user ] } = await client.query(`
            SELECT * FROM users
            WHERE id=${ userId };
        `)
        if (!user) {
            return null;
        }

        delete user.password;

        const posts = await getPostsByUser(user.id);
        user.posts = posts;

        return user;
    } catch (error) {
        throw error;
    }
}

// creates tags on the tags table from the provided list and then returns the created tags
const createTags = async (tagList) => {
    if (tagList.length === 0) { 
      return; 
    }

    const insertValues = tagList.map(
      (_, index) => `$${index + 1}`).join('), (');

    const selectValues = tagList.map(
      (_, index) => `$${index + 1}`).join(', ');

    try {
      const result = await client.query(`
        INSERT INTO tags(name)
        VALUES (${ insertValues })
        ON CONFLICT (name) DO NOTHING;
      `, tagList)

      const { rows } = await client.query(`
        SELECT * FROM tags
        WHERE name
        IN (${ selectValues });
      `, tagList)

        return rows;
    } catch (error) {
      throw error;
    }
}

// connects a post and a tag using their ids as foreign keys on the post_tags table
const createPostTag = async (postId, tagId) => {
    try {
      await client.query(`
        INSERT INTO post_tags("postId", "tagId")
        VALUES ($1, $2)
        ON CONFLICT ("postId", "tagId") DO NOTHING;
      `, [postId, tagId]);
    } catch (error) {
      throw error;
    }
}

// uses the createPostTag() function to connect the list of tags to the specified post and then returns that post
const addTagsToPost = async (postId, tagList) => {
    try {
      const createPostTagPromises = tagList.map(
        tag => createPostTag(postId, tag.id)
      );
  
      await Promise.all(createPostTagPromises);
  
      return await getPostById(postId);
    } catch (error) {
      throw error;
    }
}

// gets a list of posts that have the specified tag
const getPostsByTagName = async (tagName) => {
    try {
      const { rows: postIds } = await client.query(`
        SELECT posts.id
        FROM posts
        JOIN post_tags ON posts.id=post_tags."postId"
        JOIN tags ON tags.id=post_tags."tagId"
        WHERE tags.name=$1;
      `, [tagName]);
  
      return await Promise.all(postIds.map(
        post => getPostById(post.id)
      ));
    } catch (error) {
      throw error;
    }
} 

module.exports = {
    client,
    getAllUsers,
    createUser,
    updateUser,
    createPost,
    updatePost,
    getAllPosts,
    getUserById,
    createTags,
    addTagsToPost,
    getPostsByTagName
}