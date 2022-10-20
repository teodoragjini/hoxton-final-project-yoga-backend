import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
dotenv.config();

const app = express();
app.use(cors());
app.options("*", cors());
app.use(express.json());

const prisma = new PrismaClient();

const port = 1234;

const SECRET = "ABC";

function getToken(id: number) {
  return jwt.sign({ id: id }, SECRET, {
    expiresIn: "365 days",
  });
}

async function getCurrentUser(token: string) {
  //@ts-ignore
  const { id } = jwt.verify(token, SECRET);
  const user = await prisma.user.findUnique({
    // @ts-ignore
    where: { id: id },
  });
  return user;
}

async function getCurrentInstructor(token: string) {
  //@ts-ignore
  const { id } = jwt.verify(token, SECRET);
  const instructor = await prisma.instructor.findUnique({
    // @ts-ignore
    where: { id: id },
  });
  return instructor;
}

app.get("/users", async (req, res) => {
  const users = await prisma.user.findMany({
    include: { courses: true, reviews: true },
  });
  res.send(users);
});

app.get("/user/:id", async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: Number(req.params.id) },
    include: { courses: true, reviews: true },
  });

  if (user) {
    res.send(user);
  } else {
    res.status(404).send({ error: "User not found" });
  }
});

app.get("/instructors", async (req, res) => {
  const instructor = await prisma.instructor.findMany({
    include: { courses: true },
  });
  res.send(instructor);
});

app.get("/instructor/:id", async (req, res) => {
  const instructor = await prisma.instructor.findUnique({
    where: { id: Number(req.params.id) },
    include: { courses: true },
  });

  if (instructor) {
    res.send(instructor);
  } else {
    res.status(404).send({ error: "Instructor not found" });
  }
});

app.get("/courses",async (req, res) => {
  const course = await prisma.course.findMany({
    include:{videos:true, Instructor:true}}) 
    res.send(course)
})

app.get("/courses/:id",async (req, res) => {
  const course = await prisma.course.findUnique({
    where: { id: Number(req.params.id) },
    include: { videos: true, Instructor: true, reviews: {include: {User: true}} },
  });

  if (course) {
    res.send(course);
  } else {
    res.status(404).send({ error: "Course not found" });
  }
})

app.post("/courses/:id/buy", async (req, res) => {
  const course = await prisma.course.update({
    where: {
      id: Number(req.params.id) }
    },
    data: {
      users: {
        createMany: {
          data: [id: ],
        },
      },
    },
  })


  const review = await prisma.review.create({
    data:req.body,
    include: {User:true}
  })
  res.send(review)
})

app.get("/reviews", async (req,res) => {
  const review = await prisma.review.findMany({
    include:{User:true}
  })
  res.send(review)
})

app.post("/review", async (req, res) => {
  const review = await prisma.review.create({
    data:req.body,
    include: {User:true}
  })
  res.send(review)
})

app.post("/sign-up/user", async (req, res) => {
  try {
    const match = await prisma.user.findUnique({
      where: { email: req.body.email },
    });

    if (match) {
      res.status(400).send({ error: "This account already exists." });
    } else {
      const newUser = await prisma.user.create({
        //@ts-ignore
        data: {
          name: req.body.name,
          // lastName: req.body.lastName,
          email: req.body.email,
          password: bcrypt.hashSync(req.body.password),
        },
      });

      res.send({ user: newUser, token: getToken(newUser.id) });
    }
  } catch (error) {
    // @ts-ignore
    res.status(400).send({ error: error.message });
  }
});

app.post("/sign-in", async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { email: req.body.email },
  });
  if (user && bcrypt.compareSync(req.body.password, user.password)) {
    res.send({ user: user, token: getToken(user.id) });
  } else {
    res.status(400).send({ error: "Invalid email/password combination." });
  }
});

app.post("/sign-in/instructor", async (req, res) => {
  const instructor = await prisma.instructor.findUnique({
    where: { email: req.body.email },
  });
  if (
    instructor &&
    bcrypt.compareSync(req.body.password, instructor.password)
  ) {
    res.send({ instructor: instructor, token: getToken(instructor.id) });
  } else {
    res.status(400).send({ error: "Invalid email/password combination." });
  }
});

app.get("/validate/user", async (req, res) => {
  try {
    if (req.headers.authorization) {
      const user = await getCurrentUser(req.headers.authorization);
      // @ts-ignore
      res.send({ user, token: getToken(user.id) });
    }
  } catch (error) {
    // @ts-ignore
    res.status(400).send({ error: error.message });
  }
});

app.get("/validate/instructor", async (req, res) => {
  try {
    if (req.headers.authorization) {
      const instructor = await getCurrentInstructor(req.headers.authorization);
      // @ts-ignore
      res.send({ instructor, token: getToken(instructor.id) });
    }
  } catch (error) {
    // @ts-ignore
    res.status(400).send({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Running: http://localhost:${port}`);
});
