import type { NextApiRequest, NextApiResponse } from "next";
import Connect from "../utils/mongoDBMongooseConnection";
import User from "../models/user";
import * as bcrypt from "bcrypt";
import jwt, { JwtPayload } from "jsonwebtoken";
import { serialize } from "cookie";
type loginData = {
  userId: string;
  username: string;
};
const generateToken = (data: loginData) => {
  const token = jwt.sign(data, process.env.PRIVATE_KEY as string, {
    expiresIn: "1h",
  });
  return token;
};
const date = new Date();
const cookieOptions = {
  expires: new Date(Date.now() + 36000000),
  path: "/",
  httpOnly: true,
};
type Data = {
  username: string;
  password: string;
  rePassword?: string;
  email: string;
};
type responseData = {
  message?: string;
  error?: string;
};

export const saveUser = async (
  req: NextApiRequest,
  res: NextApiResponse<responseData>
) => {
  try {
    const { username, password, rePassword, email } = req.body;

    if (
      username &&
      password &&
      rePassword &&
      email &&
      password.match(
        /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/
      ) &&
      password === rePassword
    ) {
      const salt = bcrypt.genSaltSync(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const data = {
        username,
        password: hashedPassword,
        email,
      };
      await Connect();
      await User.create<Data>(data);
      res.status(200).send({ message: "Successfully" });
      return;
    } else {
      res.status(400).send({ error: "There is an error" });
      return;
    }
  } catch (err: any) {
    if (err.code === 11000 && err.keyValue.email) {
      res.status(409).send({ error: "Email already exists." });
      return;
    }
    if (err.code === 11000 && err.keyValue.username) {
      res.status(409).send({ error: "Username already exists." });
      return;
    }
    res.status(400).send({ error: "There is an error" });
    return;
  }
};
export const loginUser = async (
  req: NextApiRequest,
  res: NextApiResponse<responseData>
) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) {
      res.status(401).send({ message: "Wrong username or password" });
      return;
    }
    const status = await bcrypt.compare(password, user.password);
    if (!status) {
      res.status(401).send({ message: "Wrong username or password" });
      return;
    }
    const token = generateToken({
      userId: user._id,
      username: user.username,
    });

    res.setHeader("Set-Cookie", serialize("token", token, cookieOptions));
    res.status(200).send(user);
    return;
  } catch (err) {
    res.status(400).send({ error: "There is an error" });
    return;
  }
};
export const checkAuthentication = async (
  req: NextApiRequest,
  res: NextApiResponse<responseData>
) => {
  const { cookies } = req;
  const token = cookies.token;
  if (!token) {
    return;
  }
  const decoded = jwt.verify(
    token,
    process.env.PRIVATE_KEY as string
  ) as JwtPayload;
  if (!decoded) {
    return;
  }
  const { username } = decoded;
  const user = await User.findOne({ username });
  res.status(200).send(user);
};
export const deleteToken = (
  req: NextApiRequest,
  res: NextApiResponse<responseData>
) => {
  res.setHeader(
    "Set-Cookie",
    "token=deleted; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
  );
  res.status(200).send({ message: "Successfully" });
};
