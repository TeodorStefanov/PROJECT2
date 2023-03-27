import type { NextApiRequest, NextApiResponse } from "next";
import { Server } from "socket.io";
import type { Server as HTTPServer } from "http";
import type { Socket as NetSocket } from "net";
import type { Server as IOServer } from "socket.io";
import { createFriendRequestNotification } from "../../controllers/notifications";
import { likes } from "../../utils/socket/likes";
import { comments } from "../../utils/socket/comments";
import { newCart } from "../../controllers/posts";
import { acceptFriendRequest } from "../../controllers/user";
import { addLikeToComment } from "../../controllers/comments";

interface SocketServer extends HTTPServer {
  io?: IOServer | undefined;
}

interface SocketWithIO extends NetSocket {
  server: SocketServer;
}

interface NextApiResponseWithSocket extends NextApiResponse {
  socket: SocketWithIO;
}
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponseWithSocket
) {
  if (res.socket.server.io) {
    res.socket.setMaxListeners(20);
  } else {
    console.log("Server is initiializing");

    const io = new Server(res.socket.server);
    res.socket.server.io = io;
    io.on("connection", (socket) => {
      console.log("server is connected");
      socket.on("joinRoom", (id) => {
        socket.join(id);
      });
      socket.on(
        "allPosts",
        async (userId, content, imageUrl, videoUrl, createdBy) => {
          io.in(userId).emit(
            "allPosts",
            await newCart(userId, content, imageUrl, videoUrl, createdBy)
          );
        }
      );
      socket.on("addLike", async (postId, userId, method, roomId) => {
        io.in(roomId).emit(
          "addLike",
          await likes(postId, userId, method, roomId)
        );
      });
      socket.on(
        "allComments",
        async (
          userId: string,
          id: string,
          contentComment: string,
          roomId: string,
          postId: string
        ) => {
          io.in(roomId).emit(
            "allComments",
            await comments(userId, id, contentComment, roomId, postId)
          );
        }
      );
      socket.on("sentFriendRequest", async (userId, friendId) => {
        io.in(friendId).emit(
          "sentFriendRequest",
          await createFriendRequestNotification(userId, friendId)
        );
      });
      socket.on(
        "acceptFriendRequest",
        async (userId, friendId, notificationId) => {
          io.in(friendId).emit(
            "acceptFriendRequest",
            await acceptFriendRequest(userId, friendId, notificationId)
          );
        }
      );
      socket.on("addLikeToComment", async (commentId, userId, postId, id) => {
        io.in(id).emit(
          "addLikeToComment",
          await addLikeToComment(commentId, userId, postId, id)
        );
      });
    });
  }
  res.end();
}
