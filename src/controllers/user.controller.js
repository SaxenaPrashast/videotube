import asyncHandler from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";

const generateAcessAndRefreshTokens = async(userId)=>{
    try {
        const user = await User.findById(userId)
        const acessToken =  user.generateAcessToken()
        const refreshToken =  user.generateRefreshToken()

        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave: false});

        return {acessToken,refreshToken}
    } catch (error) {
        throw new ApiError(500,"Something went wrong while generating refresh and acess token")
    }
}

const registerUser = asyncHandler( async (req,res)=>{
    //get user details from the user frontend
    //validation-not empty
    //check if the user already exists: username, email
    //check for images, check for avatar
    //upload them to calculator, avatar
    // create user object - create entry in db
    //remove password and refresh token field from respose
    // check for user creation 


    const {fullname, email, username, password}=req.body

    if([fullname,email, username, password].some((field)=>field?.trim()=== "")){
        throw new ApiError(400, "All fields are required") 
    }

    const existedUser = await User.findOne({
        $or : [{username},{email}]
    })

    if(existedUser){
        throw new ApiError(409, "User with email or username already exists")
    }

    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
const coverImage = coverImageLocalPath ? await uploadOnCloudinary(coverImageLocalPath) : null;


    
    
    if(!avatar){
        throw new ApiError(400, "Avatar file is required")
    }

    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username:username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )
})

const loginUser = asyncHandler(async (req,res)=>{
    //TODO
    /*
    req body = data
    username and email
    find the user
    password check
    acess token and refresh token
    send cookie

     */
    const {email,username,password} = req.body
    if(!(username || email)){
        throw new ApiError(400,"username or password is required")
    }

    const user = await User.findOne({
        $or : [{username},{email}]
    })

    if(!user){
        throw new ApiError(400,"User does not exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password);
    if(!isPasswordValid){
        throw new ApiError(401,"Invalid User credentials")
    }

    const {acessToken, refreshToken} = await generateAcessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    const options = {
        httpOnly:true,
        secure:true
    }

    return res.status(200).cookie("acessToken", acessToken, options).cookie("refreshToken", refreshToken,options).json(
        new ApiResponse(
            200,
            {
                user: loggedInUser, acessToken,
                refreshToken
            },
            "User logged In sucessfully"
        )
    )
})

const logoutUser = asyncHandler(async (req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken: undefined
            }
        },
        {
            new:true
        }
    )
    const options = {
        httpOnly:true,
        secure:true
    }

    return res.status(200).clearCookie("acessToken", options).clearCookie("refreshToken", options).json(new ApiResponse(200,{},"User logged Out "))

})
export {registerUser,loginUser,logoutUser}