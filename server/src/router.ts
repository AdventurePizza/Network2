// @ts-nocheck
import express from "express";
import http from "http";
import socketio from "socket.io";
import cors from "cors";
import users from "./users";

const bp = require('body-parser')
const port = process.env.PORT || 8000;
const app = express();
const httpServer = http.createServer(app);
const io = new socketio.Server(httpServer);
const clientProfiles: {
	[key: string]: {
		socketId: string;
		wallet: string;
	};
} = {};

export class Router {
	constructor() {
		httpServer.listen(port, () => {
			console.log("server listening on port", port);
		});
		app.use(cors());
		app.use(bp.json())
		app.use(bp.urlencoded({ extended: true }))

		app.use("/users", users);

		io.on("connect", (socket: any) => {
			console.log("connected");

			socket.on("join", (data) => {
				console.log("join")
				console.log(data)
				clientProfiles[socket.id] = {
					socketId: socket.id,
					wallet: data
				};

				socket
					.broadcast.emit(
						"online",
						clientProfiles
					);
			});

			socket.on("profile", (data) => {
				socket
					.broadcast.emit(
						"profile",
						data
					);
			});

			socket.on("disconnect", () => {
				console.log("disconnect");
				socket.broadcast.emit("roommate disconnect", socket.id);
				delete clientProfiles[socket.id];
			});
		});
	}
}
